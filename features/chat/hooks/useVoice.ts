'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthToken } from '../auth/AuthWrapper';

export type VoiceState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

interface UseVoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAssistantText?: (text: string) => void;
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
  const isPlayingRef = useRef(false);
  const playStartTimeRef = useRef(0);
  const nextPlayTimeRef = useRef(0);
  const stateRef = useRef(state);
  const sessionIdRef = useRef<string | null>(null);

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

  // Connect to OpenAI Realtime API
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState('connecting');
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Get ephemeral session token from our backend
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
      const ephemeralToken = sessionData.client_secret?.value;
      sessionIdRef.current = sessionData.id;
      if (!ephemeralToken) throw new Error('No session token received');

      // Open WebSocket to OpenAI Realtime API
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-20',
        [
          'realtime',
          'openai-beta.realtime-v1',
          `openai-insecure-api-key.${ephemeralToken}`,
        ]
      );

      wsRef.current = ws;

      ws.addEventListener('open', () => {
        // Set up microphone
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          micStreamRef.current = stream;
          const ctx = new AudioContext({ sampleRate: 24000 });
          audioCtxRef.current = ctx;
          nextPlayTimeRef.current = 0;

          const source = ctx.createMediaStreamSource(stream);
          micSourceRef.current = source;

          // Use ScriptProcessor to capture raw PCM (24kHz, mono, 16-bit)
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
            const base64 = btoa(
              String.fromCharCode(...new Uint8Array(int16.buffer))
            );
            ws.send(
              JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64,
              })
            );
          };

          setState('connected');
        }).catch((err) => {
          setError('Microphone access denied');
          setState('error');
          opts.onError?.('Microphone access denied');
        });
      });

      ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          // Session configured
          case 'session.created':
          case 'session.updated':
            break;

          // User started speaking (VAD)
          case 'input_audio_buffer.speech_started':
            setState('listening');
            break;

          // User stopped speaking (VAD)
          case 'input_audio_buffer.speech_stopped':
            // Commit the audio buffer for processing
            ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
            break;

          // Conversation item: user transcript
          case 'conversation.item.input_audio_transcription.completed':
            if (data.transcript) {
              opts.onTranscript?.(data.transcript, true);
            }
            break;

          // Response started
          case 'response.created':
            setState('speaking');
            break;

          // Audio delta from assistant
          case 'response.audio.delta': {
            const binary = atob(data.delta);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const int16 = new Int16Array(bytes.buffer);
            speakerQueueRef.current.push(int16);
            playQueuedAudio();
            break;
          }

          // Audio done
          case 'response.audio.done':
            break;

          // Text content from assistant
          case 'response.text.delta':
            if (data.delta) {
              opts.onAssistantText?.(data.delta);
            }
            break;

          case 'response.content_part.done':
            break;

          // Response completed
          case 'response.done':
            setState('connected');
            break;

          // Error
          case 'error':
            console.error('[voice] Realtime API error:', data.error);
            setError(data.error?.message || 'Voice error');
            setState('error');
            opts.onError?.(data.error?.message || 'Voice error');
            break;
        }
      });

      ws.addEventListener('error', () => {
        setError('WebSocket connection failed');
        setState('error');
      });

      ws.addEventListener('close', () => {
        setState('disconnected');
      });
    } catch (err: any) {
      setError(err.message);
      setState('error');
      opts.onError?.(err.message);
    }
  }, [getAuthToken, opts, playQueuedAudio]);

  const disconnect = useCallback(() => {
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
