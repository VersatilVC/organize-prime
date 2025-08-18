/**
 * Debug Safeguards - Prevents and detects performance issues
 * Only active in development mode
 */

const isDev = import.meta.env.DEV;

// Track render counts to detect infinite loops
const renderCounts = new Map<string, number>();
const renderTimestamps = new Map<string, number[]>();

// Track hook executions to detect excessive calls
const hookCounts = new Map<string, number>();
const hookTimestamps = new Map<string, number[]>();

// Rate limiting for debug calls
const lastDebugCall = new Map<string, number>();
const DEBUG_RATE_LIMIT = 100; // Max one debug call per 100ms per component

export const debugSafeguards = {
  /**
   * Track component renders to detect infinite loops
   */
  trackRender: (componentName: string, props?: any) => {
    if (!isDev) return;

    try {
      const now = Date.now();
      
      // Rate limiting - prevent excessive debug calls
      const lastCall = lastDebugCall.get(componentName) || 0;
      if (now - lastCall < DEBUG_RATE_LIMIT) {
        return; // Skip this call to prevent spam
      }
      lastDebugCall.set(componentName, now);
    const count = (renderCounts.get(componentName) || 0) + 1;
    renderCounts.set(componentName, count);

    // Track recent timestamps
    const timestamps = renderTimestamps.get(componentName) || [];
    timestamps.push(now);
    
    // Keep only timestamps from last 5 seconds
    const recentTimestamps = timestamps.filter(t => now - t < 5000);
    renderTimestamps.set(componentName, recentTimestamps);

    // Alert if component renders too frequently
    if (recentTimestamps.length > 10) {
      console.error(`🚨 INFINITE RENDER LOOP DETECTED: ${componentName}`, {
        rendersInLast5Seconds: recentTimestamps.length,
        totalRenders: count,
        props,
        stack: new Error().stack
      });
      
      // Clear to prevent spam
      renderTimestamps.set(componentName, []);
    } else if (recentTimestamps.length > 5) {
      console.warn(`⚠️ High render frequency: ${componentName} (${recentTimestamps.length} renders in 5s)`, {
        props
      });
    }
    } catch (error) {
      // Silently ignore debug tracking errors to prevent app crashes
      if (isDev) {
        console.warn('Debug tracking error in trackRender:', error);
      }
    }
  },

  /**
   * Track hook executions to detect excessive calls
   */
  trackHook: (hookName: string, deps?: any[]) => {
    if (!isDev) return;

    try {
      const now = Date.now();
    const count = (hookCounts.get(hookName) || 0) + 1;
    hookCounts.set(hookName, count);

    // Track recent timestamps
    const timestamps = hookTimestamps.get(hookName) || [];
    timestamps.push(now);
    
    // Keep only timestamps from last 10 seconds
    const recentTimestamps = timestamps.filter(t => now - t < 10000);
    hookTimestamps.set(hookName, recentTimestamps);

    // Alert if hook executes too frequently
    if (recentTimestamps.length > 20) {
      console.error(`🚨 INFINITE HOOK LOOP DETECTED: ${hookName}`, {
        executionsInLast10Seconds: recentTimestamps.length,
        totalExecutions: count,
        dependencies: deps,
        stack: new Error().stack
      });
      
      // Clear to prevent spam
      hookTimestamps.set(hookName, []);
    } else if (recentTimestamps.length > 10) {
      console.warn(`⚠️ High hook execution frequency: ${hookName} (${recentTimestamps.length} calls in 10s)`, {
        dependencies: deps
      });
    }
    } catch (error) {
      // Silently ignore debug tracking errors
      if (isDev) {
        console.warn('Debug tracking error in trackHook:', error);
      }
    }
  },

  /**
   * Track useEffect dependencies to detect unstable references
   */
  trackEffect: (effectName: string, deps: any[]) => {
    if (!isDev) return;

    const now = Date.now();
    const key = `effect:${effectName}`;
    
    // Track dependency changes
    const prevDeps = (window as any).__debugDeps?.[effectName];
    if (prevDeps) {
      const changedDeps = deps.filter((dep, index) => dep !== prevDeps[index]);
      if (changedDeps.length > 0) {
        console.log(`🔍 Effect dependencies changed: ${effectName}`, {
          changedDependencies: changedDeps,
          allDependencies: deps,
          previousDependencies: prevDeps
        });
      }
    }

    // Store current deps for next comparison
    if (!(window as any).__debugDeps) {
      (window as any).__debugDeps = {};
    }
    (window as any).__debugDeps[effectName] = [...deps];

    // Track execution frequency
    debugSafeguards.trackHook(key, deps);
  },

  /**
   * Track Supabase auth events to detect excessive session checks
   */
  trackAuthEvent: (event: string, session?: any) => {
    if (!isDev) return;

    const now = Date.now();
    const key = `auth:${event}`;
    
    debugSafeguards.trackHook(key);

    // Special tracking for session events
    if (event === 'getSession' || event === 'onAuthStateChange') {
      const sessionId = session?.access_token?.slice(-8) || 'none';
      console.log(`🔍 Auth event: ${event}`, {
        sessionId,
        timestamp: new Date(now).toISOString()
      });
    }
  },

  /**
   * Monitor React Query cache to detect excessive invalidations
   */
  trackQueryInvalidation: (queryKey: string[]) => {
    if (!isDev) return;

    const key = `query:${queryKey.join(':')}`;
    debugSafeguards.trackHook(key);
  },

  /**
   * Reset all tracking data (useful for testing)
   */
  reset: () => {
    if (!isDev) return;

    renderCounts.clear();
    renderTimestamps.clear();
    hookCounts.clear();
    hookTimestamps.clear();
    
    if ((window as any).__debugDeps) {
      (window as any).__debugDeps = {};
    }
    
    console.log('🔄 Debug safeguards reset');
  },

  /**
   * Get current statistics
   */
  getStats: () => {
    if (!isDev) return {};

    return {
      renders: Object.fromEntries(renderCounts),
      hooks: Object.fromEntries(hookCounts),
      activeTracking: {
        components: renderCounts.size,
        hooks: hookCounts.size
      }
    };
  }
};

// Add global debug helpers
if (isDev) {
  (window as any).__debugSafeguards = debugSafeguards;
  console.log('🛡️ Debug safeguards active. Use window.__debugSafeguards to inspect.');
}

export default debugSafeguards;