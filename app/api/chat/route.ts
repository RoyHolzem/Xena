import { NextRequest } from 'next/server';
import { getServerConfig } from '@/lib/config';
import type { ChatMessage } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { messages?: ChatMessage[] };
  const inputMessages = Array.isArray(body.messages) ? body.messages : [];
  const serverConfig = getServerConfig();

  const upstreamMessages = [
    { role: 'system', content: serverConfig.systemPrompt },
    ...inputMessages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({ role: message.role, content: message.content }))
  ];

  const upstream = await fetch(`${serverConfig.gatewayUrl}${serverConfig.chatPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serverConfig.gatewayToken}`
    },
    body: JSON.stringify({
      model: serverConfig.model,
      stream: true,
      messages: upstreamMessages
    })
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text || 'Gateway request failed', { status: upstream.status || 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      send({ type: 'status', status: 'processing', label: 'Xena is processing' });

      const reader = upstream.body!.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';

          for (const chunk of chunks) {
            const line = chunk
              .split('\n')
              .find((entry) => entry.startsWith('data:'));
            if (!line) continue;
            const data = line.slice(5).trim();
            if (!data) continue;
            if (data === '[DONE]') {
              send({ type: 'done' });
              continue;
            }

            const json = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
            };

            const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content;
            if (delta) {
              send({ type: 'status', status: 'typing', label: 'Xena is typing' });
              send({ type: 'delta', content: delta });
            }
          }
        }

        send({ type: 'done' });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upstream error';
        send({ type: 'error', error: message });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
