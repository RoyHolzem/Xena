'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthToken } from '../../auth/AuthWrapper';

export type VoiceState = 'disconnected' | 'recording' | 'transcribing' | 'responding' | 'playing' | 'error';

interface UseVoiceOptions {
  onUserTranscript?: (text: string) => void;
  onAssistantDelta?: (delta: string) => void;
  onResponseStart?: () => void;
  onResponseDone?: () => void;
  onError?: (error: string) => void;
}

export function useVoice(opts: UseVoiceOptions = {}) {
  const getAuthToken = useAuthToken();
  const [state, setState] = useState<VoiceState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const stateRef = useRef(state);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  stateRef.current = state;

  // Start recording from microphone
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (!isRecordingRef.current) return;
        isRecordingRef.current = false;

        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType });

        // Stop mic stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (audioBlob.size < 2000) {
          // Too small (less than ~0.1s of audio), ignore
          console.log('[voice] Audio too short, discarding');
          setState('disconnected');
          return;
        }

        // Add a small delay to ensure all chunks are collected
        await new Promise((r) => setTimeout(r, 100));

        // Step 1: Transcribe audio
        setState('transcribing');
        try {
          const token = await getAuthToken();
          if (!token) throw new Error('Not authenticated');

          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice.webm');

          const sttRes = await fetch('/api/voice/stt', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (!sttRes.ok) {
            const errData = await sttRes.json();
            throw new Error(errData.error || 'Transcription failed');
          }

          const { text } = await sttRes.json();
          if (!text?.trim()) {
            setState('disconnected');
            return;
          }

          // Show user transcript in chat
          opts.onUserTranscript?.(text.trim());

          // Step 2: Send to chat API and stream response
          setState('responding');
          opts.onResponseStart?.();

          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              model: 'operator',
              stream: true,
              messages: [{ role: 'user', content: text.trim() }],
            }),
          });

          if (!chatRes.ok || !chatRes.body) {
            const errText = await chatRes.text();
            if (chatRes.status === 502 || chatRes.status === 504) {
              // Show as a chat message, not an error
              opts.onResponseStart?.();
              opts.onAssistantDelta?.('Backend is waking up — give me a few seconds and try again.');
              opts.onResponseDone?.();
              setState('disconnected');
              return;
            }
            throw new Error(errText || `Chat error ${chatRes.status}`);
          }

          // Stream text response, break into sentences for synced TTS
          const reader = chatRes.body.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';
          let unspokenText = ''; // text waiting to be spoken
          let buffer = '';
          const sentenceQueue: string[] = [];
          let isSpeaking = false;

          // Sentence boundary regex — split on . ! ? followed by space or end
          const sentenceEnd = /([.!?])\s+/g;

          const speakNextSentence = async () => {
            if (isSpeaking || sentenceQueue.length === 0) return;
            isSpeaking = true;
            const sentence = sentenceQueue.shift()!;

            try {
              const ttsRes = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text: sentence }),
              });

              if (ttsRes.ok && ttsRes.body) {
                const audioBlob = await ttsRes.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                await new Promise<void>((resolve) => {
                  audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
                  audio.onerror = () => { URL.revokeObjectURL(audioUrl); resolve(); };
                  audio.play().catch(resolve);
                });
              }
            } catch {
              // TTS failed for this sentence, move on
            }

            isSpeaking = false;
            // Speak next queued sentence
            if (sentenceQueue.length > 0) {
              speakNextSentence();
            } else if (streamDone) {
              // All done
              setState('disconnected');
            }
          };

          let streamDone = false;

          const flushSentences = (force: boolean) => {
            // Extract complete sentences from unspokenText
            let match;
            let lastEnd = -1;
            sentenceEnd.lastIndex = 0;
            while ((match = sentenceEnd.exec(unspokenText)) !== null) {
              lastEnd = match.index + match[1].length;
            }

            if (lastEnd > 0) {
              const toSpeak = unspokenText.substring(0, lastEnd).trim();
              unspokenText = unspokenText.substring(lastEnd).trimStart();
              if (toSpeak) {
                sentenceQueue.push(toSpeak);
                if (!isSpeaking) {
                  setState('playing');
                  speakNextSentence();
                }
              }
            }

            // On force (stream done), speak whatever remains
            if (force && unspokenText.trim()) {
              sentenceQueue.push(unspokenText.trim());
              unspokenText = '';
              if (!isSpeaking) {
                setState('playing');
                speakNextSentence();
              }
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
              const line = part.split('\n').find((l) => l.startsWith('data:'));
              if (!line) continue;
              const raw = line.slice(5).trim();
              if (!raw || raw === '[DONE]') continue;

              try {
                const parsed = JSON.parse(raw);
                const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content;
                if (delta) {
                  fullResponse += delta;
                  unspokenText += delta;
                  opts.onAssistantDelta?.(delta);
                  flushSentences(false);
                }
              } catch {
                // ignore
              }
            }
          }

          // Flush any remaining text
          streamDone = true;
          flushSentences(true);

          opts.onResponseDone?.();

          // If nothing to speak (empty response or TTS already done), disconnect
          if (sentenceQueue.length === 0 && !isSpeaking) {
            setState('disconnected');
          }
        } catch (err: any) {
          console.error('[voice] Error:', err);
          setError(err.message);
          setState('error');
          opts.onError?.(err.message);
        }
      };

      recorder.start(250); // push chunks every 250ms
      isRecordingRef.current = true;
      setState('recording');
    } catch (err: any) {
      setError('Microphone access denied');
      setState('error');
      opts.onError?.('Microphone access denied');
    }
  }, [getAuthToken, opts]);

  // Stop recording (triggers onstop → STT → Chat → TTS pipeline)
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Cancel everything
  const cancel = useCallback(() => {
    isRecordingRef.current = false;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    setState('disconnected');
    setError(null);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  // Toggle: tap to start recording, tap again to stop and process
  const toggle = useCallback(() => {
    if (state === 'disconnected' || state === 'error') {
      setError(null);
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    } else {
      // In the middle of processing — cancel
      cancel();
    }
  }, [state, startRecording, stopRecording, cancel]);

  const isActive = state !== 'disconnected';

  return {
    state,
    error,
    toggle,
    cancel,
    isActive,
    isRecording: state === 'recording',
    isProcessing: state === 'transcribing' || state === 'responding',
    isPlaying: state === 'playing',
  };
}
