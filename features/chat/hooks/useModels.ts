'use client';

import { useEffect, useState } from 'react';

export type ModelInfo = {
  id: string;       // e.g. "zai/glm-4.7-flash"
  name: string;     // e.g. "GLM-4.7 Flash"
  provider: string; // e.g. "zai"
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
        const list: ModelInfo[] = data.models || [];
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
