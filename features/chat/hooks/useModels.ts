'use client';

import { useEffect, useState } from 'react';

export type ModelInfo = {
  id: string;
  name?: string;
  owned_by?: string;
};

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch('/api/models')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: ModelInfo[] = data.data || data.models || [];
        setModels(list);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { models, loading, error };
}
