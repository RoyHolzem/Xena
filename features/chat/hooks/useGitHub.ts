'use client';

import { useEffect, useState } from 'react';

const GH_REPO = 'RoyHolzem/LiveCenter-Simple';
const GH_BRANCH = 'staging';

export function useGitHub() {
  const [ghStatus, setGhStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [ghCommit, setGhCommit] = useState<string>('-');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${GH_REPO}/branches/${GH_BRANCH}`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!res.ok) throw new Error('GitHub API error');
        const data = await res.json();
        if (!cancelled) {
          setGhStatus('connected');
          setGhCommit(data.commit?.sha?.slice(0, 7) || '-');
        }
      } catch {
        if (!cancelled) setGhStatus('error');
      }
    };
    void check();
    const interval = setInterval(() => void check(), 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { ghStatus, ghCommit, ghRepo: GH_REPO, ghBranch: GH_BRANCH };
}
