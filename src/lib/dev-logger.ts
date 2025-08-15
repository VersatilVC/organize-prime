/**
 * Development-only logging utility
 * Automatically removes logs in production builds
 */

const isDev = import.meta.env.DEV;

export const devLog = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Always show errors, but with context in dev
    if (isDev) {
      console.error(...args);
    } else {
      // In production, still log errors but without sensitive details
      console.error('An error occurred');
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  }
};

/**
 * Conditional logging for feature development
 */
export const featureLog = (feature: string) => ({
  log: (...args: unknown[]) => {
    if (isDev) console.log(`🔍 ${feature}:`, ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(`⚠️ ${feature}:`, ...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(`❌ ${feature}:`, ...args);
    } else {
      console.error(`${feature} error occurred`);
    }
  },
  success: (...args: unknown[]) => {
    if (isDev) console.log(`✅ ${feature}:`, ...args);
  }
});

/**
 * Performance logging for development
 */
export const perfLog = {
  start: (label: string) => {
    if (isDev) console.time(label);
  },
  end: (label: string) => {
    if (isDev) console.timeEnd(label);
  },
  mark: (label: string, ...details: unknown[]) => {
    if (isDev) console.log(`⏱️ ${label}:`, ...details);
  }
};