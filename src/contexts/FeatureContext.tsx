import { createContext, useContext, ReactNode } from 'react';
import { useFeatureData, FeatureContext as FeatureContextType } from '@/hooks/useFeatureData';

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

interface FeatureProviderProps {
  children: ReactNode;
  slug: string;
}

export function FeatureProvider({ children, slug }: FeatureProviderProps) {
  const featureData = useFeatureData(slug);

  return (
    <FeatureContext.Provider value={featureData}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatureContext() {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatureContext must be used within a FeatureProvider');
  }
  return context;
}