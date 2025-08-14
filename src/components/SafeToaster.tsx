import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';

export const SafeToaster: React.FC = () => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Delay toaster rendering to ensure all other components are stable
    const timer = setTimeout(() => {
      console.log('Attempting to render SafeToaster');
      setShouldRender(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) {
    console.log('SafeToaster not ready, skipping render');
    return null;
  }

  try {
    return <Toaster />;
  } catch (error) {
    console.warn('SafeToaster failed to render:', error);
    return null;
  }
};