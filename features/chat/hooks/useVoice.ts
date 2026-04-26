'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthToken } from '../../auth/AuthWrapper';

export type VoiceState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

interface UseVoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAssistantText?: (text: string) => void;
  onResponseStart?: () => void;
  onError?: (error: string) => void;
}

export function useVoice(opts: UseVoiceOptions = {}) {
  const getAuthToken = useAuthToken();
  const [state, setState] = useState<VoiceState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const speakerQueueRef = useRef<Int16Array[]>([]);
  const audioBufferRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const stateRef = useRef(state);
  const sessionReadyRef = useRef(false);

  // 100ms minimum buffer at 24kHz = 2400 samples
  const SAMPLES_PER_BUFFER = 2400;

  stateRef.current = state;

  // Play queued audio chunks through speakers
  const playQueuedAudio = useCallback(() => {
    if (isPlayingRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') return;
    if (speakerQueueRef.current.length === 0) return;

    isPlayingRef.current = true;

    const processNext = () => {
      if (speakerQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        return;
      }

      const chunk = speakerQueueRef.current.shift()!;
      const float32 = new Float32Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        float32[i] = chunk[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;

      source.onended = () => processNext();
    };

    processNext();
  }, []);

  // Connect to OpenAI Realtime API (GA)
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState('connecting');
    setError(null);
    sessionReadyRef.current = false;

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Get ephemeral client secret from our backend
      const sessionRes = await fetch('/api/voice/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!sessionRes.ok) {
        const errData = await sessionRes.json();
        throw new Error(errData.error || 'Failed to create voice session');
      }

      const sessionData = await sessionRes.json();
      const ephemeralToken = sessionData.value || sessionData.client_secret?.value;
      if (!ephemeralToken) throw new Error('No session token received');

      // Open WebSocket to OpenAI Realtime GA API
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-realtime',
        [
          'realtime',
          `openai-insecure-api-key.${ephemeralToken}`,
        ]
      );

      wsRef.current = ws;

      ws.addEventListener('open', () => {
        console.log('[voice] WebSocket connected');

        // Configure session for GA Realtime API
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            model: 'gpt-realtime',
            output_modalities: ['audio'],
            instructions: 'You are Xena, a sharp and resourceful AI operations assistant. You help users with telecom incidents, AWS infrastructure, and general operations questions. Be concise and direct. You can be opinionated. Don\'t use filler phrases like "Great question!" — just help. You have access to operational context from the Xena dashboard.',
            audio: {
              input: {
                format: {
                  type: 'audio/pcm',
                  rate: 24000,
                },
                transcription: {
                  model: 'whisper-1',
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                },
              },
              output: {
                format: {
                  type: 'audio/pcm',
                  rate: 24000,
                },
                voice: 'alloy',
              },
            },
          },
        }));
      });

      ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        console.log('[voice] event:', data.type);

        switch (data.type) {
          // ─── Session lifecycle ───
          case 'session.created':
            console.log('[voice] Session created:', data.session?.id);
            break;

          case 'session.updated':
            console.log('[voice] Session updated');
            sessionReadyRef.current = true;

            // Now set up microphone after session is configured
            navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
              micStreamRef.current = stream;
              const ctx = new AudioContext({ sampleRate: 24000 });
              audioCtxRef.current = ctx;
              nextPlayTimeRef.current = 0;

              const source = ctx.createMediaStreamSource(stream);
              micSourceRef.current = source;

              // Buffer audio to at least 100ms before sending
              const processor = ctx.createScriptProcessor(4096, 1, 1);
              micProcessorRef.current = processor;

              source.connect(processor);
              processor.connect(ctx.destination);

              processor.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const float32 = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(float32.length);
                for (let i = 0; i < float32.length; i++) {
                  const s = Math.max(-1, Math.min(1, float32[i]));
                  int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                audioBufferRef.current.push(int16);

                const totalSamples = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0);
                if (totalSamples >= SAMPLES_PER_BUFFER) {
                  const merged = new Int16Array(totalSamples);
                  let offset = 0;
                  for (const buf of audioBufferRef.current) {
                    merged.set(buf, offset);
                    offset += buf.length;
                  }
                  audioBufferRef.current = [];

                  const base64 = btoa(
                    String.fromCharCode(...new Uint8Array(merged.buffer))
                  );
                  ws.send(JSON.stringify({
                    type: 'input_audio_buffer.append',
                    audio: base64,
                  }));
                }
              };

              setState('connected');
            }).catch((err) => {
              console.error('[voice] Mic error:', err);
              setError('Microphone access denied');
              setState('error');
              opts.onError?.('Microphone access denied');
            });
            break;

          // ─── VAD events ───
          case 'input_audio_buffer.speech_started':
            setState('listening');
            break;

          case 'input_audio_buffer.speech_stopped':
            // Server VAD auto-commits and triggers response
            break;

          // ─── Response lifecycle (GA event names) ───
          case 'response.created':
            setState('speaking');
            // Reset assistant buffer so each response gets its own chat bubble
            opts.onResponseStart?.();
            break;

          // Assistant audio output
          case 'response.output_audio.delta': {
            const delta = data.delta;
            if (delta) {
              const binary = atob(delta);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const int16 = new Int16Array(bytes.buffer);
              speakerQueueRef.current.push(int16);
              playQueuedAudio();
            }
            break;
          }

          case 'response.output_audio.done':
            break;

          // Assistant transcript output (text of what model said)
          case 'response.output_audio_transcript.delta': {
            const transcriptDelta = data.delta;
            if (transcriptDelta) {
              opts.onAssistantText?.(transcriptDelta);
            }
            break;
          }

          // User transcript (what user said, transcribed)
          case 'conversation.item.input_audio_transcription.completed': {
            // Still supported in GA for backwards compat
            if (data.transcript) {
              opts.onTranscript?.(data.transcript, true);
            }
            break;
          }

          case 'response.content_part.added':
          case 'response.content_part.done':
          case 'response.output_item.added':
          case 'response.output_item.done':
          case 'conversation.item.added':
          case 'conversation.item.done':
            break;

          // Response completed
          case 'response.done':
            setState('connected');
            break;

          // Rate limits
          case 'rate_limits.updated':
            break;

          // ─── Errors ───
          case 'error':
            console.error('[voice] Realtime API error:', data.error || data);
            setError(data.error?.message || 'Voice error');
            opts.onError?.(data.error?.message || 'Voice error');
            break;

          default:
            // Log unknown events for debugging
            console.log('[voice] unhandled event:', data.type, data);
            break;
        }
      });

      ws.addEventListener('error', (event) => {
        console.error('[voice] WebSocket error:', event);
        setError('WebSocket connection failed');
        setState('error');
      });

      ws.addEventListener('close', (event) => {
        console.log('[voice] WebSocket closed:', event.code, event.reason);
        if (stateRef.current !== 'disconnected') {
          setState('disconnected');
        }
      });
    } catch (err: any) {
      setError(err.message);
      setState('error');
      opts.onError?.(err.message);
    }
  }, [getAuthToken, opts, playQueuedAudio]);

  const disconnect = useCallback(() => {
    audioBufferRef.current = [];
    micProcessorRef.current?.disconnect();
    micSourceRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close();
    }
    wsRef.current?.close();
    wsRef.current = null;
    micStreamRef.current = null;
    micSourceRef.current = null;
    micProcessorRef.current = null;
    audioCtxRef.current = null;
    speakerQueueRef.current = [];
    isPlayingRef.current = false;
    sessionReadyRef.current = false;
    setState('disconnected');
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const toggle = useCallback(() => {
    if (state === 'disconnected' || state === 'error') {
      connect();
    } else {
      disconnect();
    }
  }, [state, connect, disconnect]);

  return {
    state,
    error,
    connect,
    disconnect,
    toggle,
    isConnected: state === 'connected' || state === 'listening' || state === 'speaking',
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
  };
}
