/**
 * Emergency Circuit Breaker - Prevents infinite loops and excessive re-renders
 * Automatically stops the application if dangerous patterns are detected
 */

const isDev = import.meta.env.DEV;

// Track render counts globally
const globalRenderCounts = new Map<string, number>();
const globalRenderTimestamps = new Map<string, number[]>();

// Emergency thresholds
const EMERGENCY_RENDER_LIMIT = 50; // Max renders per component in 10 seconds
const EMERGENCY_TIME_WINDOW = 10000; // 10 seconds
const EMERGENCY_TOTAL_LIMIT = 200; // Max total renders across all components

let totalRenders = 0;
let emergencyMode = false;
let emergencyStartTime = Date.now();

export const emergencyCircuitBreaker = {
  /**
   * Check if a component should be allowed to render
   */
  checkRenderAllowed: (componentName: string): boolean => {
    if (!isDev) return true;
    if (emergencyMode) return false;

    try {
      const now = Date.now();
      
      // Reset counters every 10 seconds
      if (now - emergencyStartTime > EMERGENCY_TIME_WINDOW) {
        globalRenderCounts.clear();
        globalRenderTimestamps.clear();
        totalRenders = 0;
        emergencyStartTime = now;
      }

    // Track this render
    const count = (globalRenderCounts.get(componentName) || 0) + 1;
    globalRenderCounts.set(componentName, count);
    totalRenders += 1;

    // Track timestamps
    const timestamps = globalRenderTimestamps.get(componentName) || [];
    timestamps.push(now);
    // Keep only last 10 seconds
    const recentTimestamps = timestamps.filter(t => now - t < EMERGENCY_TIME_WINDOW);
    globalRenderTimestamps.set(componentName, recentTimestamps);

    // Check emergency conditions
    if (recentTimestamps.length > EMERGENCY_RENDER_LIMIT) {
      console.error(`🚨 EMERGENCY STOP: ${componentName} rendered ${recentTimestamps.length} times in 10 seconds!`);
      emergencyMode = true;
      this.activateEmergencyMode(`Excessive renders: ${componentName}`);
      return false;
    }

    if (totalRenders > EMERGENCY_TOTAL_LIMIT) {
      console.error(`🚨 EMERGENCY STOP: Total renders (${totalRenders}) exceeded limit!`);
      emergencyMode = true;
      this.activateEmergencyMode(`Total render limit exceeded`);
      return false;
    }

      return true;
    } catch (error) {
      // If emergency circuit breaker itself has issues, allow render to prevent complete app freeze
      console.warn('Emergency circuit breaker error:', error);
      return true;
    }
  },

  /**
   * Activate emergency mode
   */
  activateEmergencyMode: (reason: string) => {
    emergencyMode = true;
    
    console.error('🚨 EMERGENCY MODE ACTIVATED 🚨');
    console.error('Reason:', reason);
    console.error('Render stats:', Object.fromEntries(globalRenderCounts));
    
    // Show emergency UI
    const body = document.body;
    if (body) {
      body.innerHTML = `
        <div style="
          position: fixed; 
          top: 0; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          background: #dc2626; 
          color: white; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-family: monospace; 
          z-index: 9999;
          flex-direction: column;
          text-align: center;
          padding: 2rem;
        ">
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">🚨 EMERGENCY STOP 🚨</h1>
          <p style="font-size: 1.2rem; margin-bottom: 1rem;">Infinite render loop detected!</p>
          <p style="margin-bottom: 2rem;">Reason: ${reason}</p>
          <button onclick="window.location.reload()" style="
            background: white; 
            color: #dc2626; 
            border: none; 
            padding: 1rem 2rem; 
            font-size: 1rem; 
            border-radius: 0.5rem; 
            cursor: pointer;
            font-weight: bold;
          ">Reload Page</button>
          <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.8;">Check console for detailed logs</p>
        </div>
      `;
    }
  },

  /**
   * Reset emergency mode (for testing)
   */
  reset: () => {
    emergencyMode = false;
    globalRenderCounts.clear();
    globalRenderTimestamps.clear();
    totalRenders = 0;
    emergencyStartTime = Date.now();
  },

  /**
   * Check if in emergency mode
   */
  isEmergencyMode: () => emergencyMode,

  /**
   * Get current stats
   */
  getStats: () => ({
    emergencyMode,
    totalRenders,
    componentCounts: Object.fromEntries(globalRenderCounts),
    timeWindow: EMERGENCY_TIME_WINDOW,
    renderLimit: EMERGENCY_RENDER_LIMIT
  })
};

// Add to global for debugging
if (isDev) {
  (globalThis as any).__emergencyCircuitBreaker = emergencyCircuitBreaker;
  console.log('🛡️ Emergency circuit breaker active');
}

export default emergencyCircuitBreaker;