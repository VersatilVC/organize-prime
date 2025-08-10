import { useMemo, useState } from 'react';

export function useKBSettings() {
  const [settings, setSettings] = useState({
    embeddingModel: 'text-embedding-ada-002',
    chunkSize: 1000,
    chunkOverlap: 200,
    maxTokens: 2000,
  });

  const update = (partial: Partial<typeof settings>) => setSettings(prev => ({ ...prev, ...partial }));
  return useMemo(() => ({ settings, update }), [settings]);
}
