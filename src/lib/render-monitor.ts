/**
 * Render Performance Monitor
 * Tracks component re-render patterns without causing infinite loops
 */

const isDev = import.meta.env.DEV;

interface RenderData {
  component: string;
  count: number;
  lastRender: number;
  averageInterval: number;
  timestamps: number[];
}

class RenderMonitor {
  private renderData = new Map<string, RenderData>();
  private maxTimestamps = 20; // Keep last 20 render timestamps
  private warningThreshold = 10; // Warn if >10 renders in 5 seconds
  private criticalThreshold = 25; // Critical if >25 renders in 5 seconds
  private timeWindow = 5000; // 5 second window
  
  track(componentName: string): void {
    if (!isDev) return;
    
    try {
      const now = Date.now();
      const existing = this.renderData.get(componentName);
      
      if (!existing) {
        this.renderData.set(componentName, {
          component: componentName,
          count: 1,
          lastRender: now,
          averageInterval: 0,
          timestamps: [now]
        });
        return;
      }
      
      // Update render data
      existing.count++;
      existing.timestamps.push(now);
      
      // Keep only recent timestamps
      existing.timestamps = existing.timestamps.filter(t => now - t < this.timeWindow);
      
      // Calculate average interval
      if (existing.timestamps.length > 1) {
        const intervals = existing.timestamps.slice(1).map((t, i) => t - existing.timestamps[i]);
        existing.averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      }
      
      existing.lastRender = now;
      
      // Check for performance issues
      const recentRenders = existing.timestamps.length;
      
      if (recentRenders >= this.criticalThreshold) {
        console.error(`🚨 CRITICAL: ${componentName} rendered ${recentRenders} times in ${this.timeWindow/1000}s`, {
          averageInterval: existing.averageInterval,
          totalRenders: existing.count
        });
      } else if (recentRenders >= this.warningThreshold) {
        console.warn(`⚠️ Performance warning: ${componentName} rendered ${recentRenders} times in ${this.timeWindow/1000}s`, {
          averageInterval: existing.averageInterval
        });
      }
      
    } catch (error) {
      // Silent failure to prevent monitor from breaking app
    }
  }
  
  getStats(): Record<string, Omit<RenderData, 'timestamps'>> {
    if (!isDev) return {};
    
    const stats: Record<string, Omit<RenderData, 'timestamps'>> = {};
    
    for (const [component, data] of this.renderData) {
      stats[component] = {
        component: data.component,
        count: data.count,
        lastRender: data.lastRender,
        averageInterval: data.averageInterval
      };
    }
    
    return stats;
  }
  
  reset(): void {
    if (!isDev) return;
    this.renderData.clear();
  }
}

export const renderMonitor = new RenderMonitor();

// Add to global for debugging
if (isDev && typeof window !== 'undefined') {
  (window as any).__renderMonitor = renderMonitor;
}

export default renderMonitor;