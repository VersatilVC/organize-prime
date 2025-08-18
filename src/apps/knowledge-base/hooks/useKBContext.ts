import * as React from 'react';
import { KBContext } from '../context/KBContext';

export function useKBContext() {
  const ctx = React.useContext(KBContext);
  if (!ctx) throw new Error('useKBContext must be used within KBProvider');
  return ctx;
}