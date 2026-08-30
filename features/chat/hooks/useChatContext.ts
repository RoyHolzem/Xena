'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import type { ChatMessage, TelecomRecord, TelecomView } from '@/lib/types';
import type { PinnedCard } from '../components/ContextCard';

/**
 * Matches recent chat messages against loaded telecom records.
 *
 * Sticky by design: scans the last N messages for recordId mentions.
 * Once a record is matched, it stays active until:
 *  - A different record is matched
 *  - The conversation clearly moves on (no mention in last 8 messages)
 *
 * Matching strategy (first match wins):
 *  1. Exact recordId match
 *  2. Circuit / fiber / site code match
 *  3. Fuzzy title / company / city / operator substring match
 */
export function useChatContext(
  messages: ChatMessage[],
  recordsByView: Record<TelecomView, TelecomRecord[]>,
): {
  matchedRecord: TelecomRecord | null;
  matchedView: TelecomView | null;
  pinnedCards: PinnedCard[];
} {
  // Keep the last matched record for stickiness
  const lastMatch = useRef<{ record: TelecomRecord; view: TelecomView } | null>(null);

  // Pinned cards: persist cards on messages even after conversation moves on
  const [pinnedCards, setPinnedCards] = useState<PinnedCard[]>([]);

  const result = useMemo(() => {
    // Scan all messages from newest to oldest for a match
    // Use the last 8 messages as the search window
    const window = messages.slice(-8);
    const text = window
      .map(m => m.content)
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!text) return { matchedRecord: null, matchedView: null };

    const views: TelecomView[] = ['incidents', 'events', 'planned-works', 'orders'];

    // Strategy 1: exact recordId - highest priority
    for (const view of views) {
      for (const rec of recordsByView[view]) {
        const id = rec.recordId.toLowerCase();
        if (id && text.includes(id)) {
          return { matchedRecord: rec, matchedView: view };
        }
      }
    }

    // Strategy 2: circuit / fiber / site codes
    for (const view of views) {
      for (const rec of recordsByView[view]) {
        const codes = [rec.circuitId, rec.fiberId, rec.siteCode]
          .map((c) => c.toLowerCase())
          .filter((c) => c && c !== '-' && c.length > 2);

        for (const code of codes) {
          if (text.includes(code)) {
            return { matchedRecord: rec, matchedView: view };
          }
        }
      }
    }

    // Strategy 3: fuzzy substring match
    let bestScore = 0;
    let bestRecord: TelecomRecord | null = null;
    let bestView: TelecomView | null = null;

    for (const view of views) {
      for (const rec of recordsByView[view]) {
        let score = 0;

        const fields: Array<{ value: string; weight: number }> = [
          { value: rec.title, weight: 10 },
          { value: rec.summary, weight: 5 },
          { value: rec.companyName, weight: 6 },
          { value: rec.customerName, weight: 5 },
          { value: rec.city, weight: 4 },
          { value: rec.operatorName, weight: 4 },
          { value: rec.networkRegion, weight: 3 },
          { value: rec.serviceType, weight: 3 },
          { value: rec.networkSegment, weight: 3 },
          { value: rec.typeCode, weight: 3 },
          ...rec.highlights.map((h) => ({ value: h.value, weight: 2 })),
          ...rec.facts.map((f) => ({ value: f.value, weight: 1 })),
        ];

        for (const field of fields) {
          const fv = field.value.toLowerCase();
          if (!fv || fv === '-') continue;

          const tokens = fv.split(/[\s,.-]+/).filter((t) => t.length > 2);
          let matchedTokens = 0;
          for (const token of tokens) {
            if (text.includes(token)) matchedTokens++;
          }

          const tokenRatio = tokens.length > 0 ? matchedTokens / tokens.length : 0;
          if (tokenRatio >= 0.5 || (fv.length > 5 && text.includes(fv))) {
            score += Math.round(field.weight * tokenRatio);
          }
        }

        if (rec.severity !== '-' && text.includes(rec.severity.toLowerCase())) score += 3;
        if (rec.status !== '-' && text.includes(rec.status.replace('_', ' ').toLowerCase())) score += 2;

        if (score > bestScore) {
          bestScore = score;
          bestRecord = rec;
          bestView = view;
        }
      }
    }

    if (bestScore >= 6 && bestRecord) {
      return { matchedRecord: bestRecord, matchedView: bestView };
    }

    return { matchedRecord: null, matchedView: null };
  }, [messages, recordsByView]);

  // Sticky logic: keep the last match if the current result is null
  // but the recordId still appears somewhere in recent messages
  let effectiveRecord = result.matchedRecord;
  let effectiveView = result.matchedView;

  if (effectiveRecord) {
    lastMatch.current = { record: effectiveRecord, view: effectiveView! };
  } else if (lastMatch.current) {
    // Check if the last matched recordId still appears in recent messages
    const window = messages.slice(-8);
    const text = window.map(m => m.content).join(' ').toLowerCase();
    const id = lastMatch.current.record.recordId.toLowerCase();
    if (text.includes(id)) {
      effectiveRecord = lastMatch.current.record;
      effectiveView = lastMatch.current.view;
    } else {
      // Conversation moved on
      lastMatch.current = null;
    }
  }

  // Pin cards: when a new match is found, pin it to the last assistant message
  useEffect(() => {
    if (effectiveRecord && effectiveView) {
      // Find the last assistant message with content
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.content.trim());
      if (lastAssistant) {
        setPinnedCards(prev => {
          // Don't duplicate if this message already has this record pinned
          const existing = prev.find(c => c.messageId === lastAssistant.id && c.record.recordId === effectiveRecord.recordId);
          if (existing) return prev;
          // Add new pin, remove any older pin for the same recordId
          const filtered = prev.filter(c => c.record.recordId !== effectiveRecord.recordId);
          return [...filtered, { messageId: lastAssistant.id, record: effectiveRecord, view: effectiveView }];
        });
      }
    }
  }, [effectiveRecord?.recordId, effectiveView, messages]);

  // Clean up pins for messages that no longer exist
  useEffect(() => {
    const messageIds = new Set(messages.map(m => m.id));
    setPinnedCards(prev => prev.filter(c => messageIds.has(c.messageId)));
  }, [messages]);

  return {
    matchedRecord: effectiveRecord,
    matchedView: effectiveView,
    pinnedCards,
  };
}
