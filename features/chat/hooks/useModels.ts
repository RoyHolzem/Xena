'use client';

import { useMemo } from 'react';

export type ModelInfo = {
  id: string;       // provider model id: "inceptionlabs/mercury-2"
  name: string;     // display name: "Mercury 2"
  provider: string; // provider group: "inceptionlabs"
  tier: string;     // speed tier: "fast" | "balanced" | "powerful"
};

/**
 * Hardcoded list of supported provider models.
 * The Gateway /v1/models only returns openclaw/* agents, not the underlying provider
 * models. We maintain the list here so users can pick via model_override.
 *
 * Update this array when new models are added to the Gateway config.
 */
const PROVIDER_MODELS: ModelInfo[] = [
  // Zhipu AI — GLM family
  { id: 'zai/glm-4.7-flash', name: 'GLM-4.7 Flash', provider: 'Zhipu AI', tier: 'fast' },
  { id: 'zai/glm-4.7-turbo', name: 'GLM-4.7 Turbo', provider: 'Zhipu AI', tier: 'balanced' },
  { id: 'zai/glm-5', name: 'GLM-5', provider: 'Zhipu AI', tier: 'powerful' },
  { id: 'zai/glm-5-turbo', name: 'GLM-5 Turbo', provider: 'Zhipu AI', tier: 'balanced' },
  { id: 'zai/glm-5.1', name: 'GLM-5.1', provider: 'Zhipu AI', tier: 'powerful' },

  // Inception Labs — diffusion-based
  { id: 'inceptionlabs/mercury-2', name: 'Mercury 2', provider: 'Inception Labs', tier: 'fast' },
];

/**
 * Returns the hardcoded provider model list.
 * No API call needed — the Gateway only lists openclaw/* agents, not underlying models.
 */
export function useModels() {
  const models = useMemo(() => PROVIDER_MODELS, []);
  return { models, loading: false, error: null };
}
