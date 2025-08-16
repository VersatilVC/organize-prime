import { useState, useEffect, useRef } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useLoadingState(dependencies: boolean[] = []) {
  const [state, setState] = useState<LoadingState>({
    isLoading: true,
    error: null,
    progress: 0
  });
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const allLoaded = dependencies.every(dep => !dep);
    
    if (allLoaded) {
      setState(prev => ({ ...prev, isLoading: false, progress: 100 }));
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      // Reset loading state when dependencies change
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      startTimeRef.current = Date.now();
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a reasonable timeout for loading
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          error: 'Loading is taking longer than expected. Please refresh the page.',
          isLoading: false
        }));
      }, 10000); // 10 second timeout
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);

  // Update progress based on elapsed time
  useEffect(() => {
    if (!state.isLoading) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(90, (elapsed / 3000) * 100); // Reach 90% in 3 seconds
      setState(prev => ({ ...prev, progress }));
    }, 100);

    return () => clearInterval(interval);
  }, [state.isLoading]);

  return state;
}

export function useStableLoading(
  isLoading: boolean, 
  minimumLoadingTime: number = 300
) {
  const [stableLoading, setStableLoading] = useState(isLoading);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading && startTimeRef.current === null) {
      // Start loading
      startTimeRef.current = Date.now();
      setStableLoading(true);
    } else if (!isLoading && startTimeRef.current !== null) {
      // Check if minimum time has elapsed
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= minimumLoadingTime) {
        setStableLoading(false);
        startTimeRef.current = null;
      } else {
        // Wait for remaining time
        const remainingTime = minimumLoadingTime - elapsed;
        setTimeout(() => {
          setStableLoading(false);
          startTimeRef.current = null;
        }, remainingTime);
      }
    }
  }, [isLoading, minimumLoadingTime]);

  return stableLoading;
}