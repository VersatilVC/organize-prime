/**
 * Environment Variable Validation System
 * Ensures all required environment variables are present and valid
 */

export interface EnvironmentConfig {
  // Supabase Configuration
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  
  // Optional Configuration
  VITE_APP_ENV?: 'development' | 'staging' | 'production';
  VITE_APP_VERSION?: string;
  VITE_ENABLE_ANALYTICS?: string;
  VITE_SENTRY_DSN?: string;
}

const requiredEnvVars: Array<keyof EnvironmentConfig> = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const optionalEnvVars: Array<keyof EnvironmentConfig> = [
  'VITE_APP_ENV',
  'VITE_APP_VERSION', 
  'VITE_ENABLE_ANALYTICS',
  'VITE_SENTRY_DSN'
];

/**
 * Validates that all required environment variables are present
 * @throws Error if any required variables are missing
 */
export function validateEnvironment(): EnvironmentConfig {
  const missing: string[] = [];
  const invalid: string[] = [];
  
  // Check required variables
  for (const key of requiredEnvVars) {
    const value = import.meta.env[key];
    if (!value) {
      missing.push(key);
    } else {
      // Validate format
      if (key === 'VITE_SUPABASE_URL' && !isValidSupabaseUrl(value)) {
        invalid.push(`${key} (invalid URL format)`);
      }
      if (key === 'VITE_SUPABASE_ANON_KEY' && !isValidSupabaseKey(value)) {
        invalid.push(`${key} (invalid key format)`);
      }
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please create a .env file in the project root with these variables.\n` +
      `See .env.example for reference.`
    );
  }
  
  if (invalid.length > 0) {
    throw new Error(
      `Invalid environment variables:\n${invalid.map(v => `  - ${v}`).join('\n')}`
    );
  }
  
  // Return validated config
  const config: EnvironmentConfig = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
  
  // Add optional variables if present
  for (const key of optionalEnvVars) {
    const value = import.meta.env[key];
    if (value) {
      (config as any)[key] = value;
    }
  }
  
  return config;
}

/**
 * Validates Supabase URL format
 */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('supabase') && parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates Supabase anon key format
 * Supports both new publishable keys (sb_publishable_...) and legacy JWT format
 */
function isValidSupabaseKey(key: string): boolean {
  // New publishable key format (sb_publishable_...)
  if (key.startsWith('sb_publishable_')) {
    return key.length > 20 && !key.includes(' ');
  }
  
  // Legacy JWT format (eyJ...)
  if (key.startsWith('eyJ')) {
    return key.length > 100 && key.includes('.') && !key.includes(' ');
  }
  
  return false;
}

/**
 * Gets environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    ssr: import.meta.env.SSR,
    baseUrl: import.meta.env.BASE_URL,
    hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/**
 * Initialize and validate environment on app startup
 */
export function initializeEnvironment(): EnvironmentConfig {
  try {
    const config = validateEnvironment();
    
    // Use a single, non-recursive console call for environment info
    if (import.meta.env.DEV) {
      // Combine all output into a single call to prevent console override loops
      const envInfo = getEnvironmentInfo();
      console.info('✅ Environment validation passed', { envInfo });
    }
    
    return config;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    
    // In development, show user-friendly error
    if (import.meta.env.DEV) {
      document.body.innerHTML = `
        <div style="
          font-family: monospace;
          background: #1a1a1a;
          color: #ff6b6b;
          padding: 2rem;
          margin: 2rem;
          border-radius: 8px;
          border: 2px solid #ff6b6b;
        ">
          <h2 style="color: #ff6b6b; margin-top: 0;">Environment Configuration Error</h2>
          <pre style="color: #fff; background: #2a2a2a; padding: 1rem; border-radius: 4px; overflow: auto;">
${error instanceof Error ? error.message : String(error)}
          </pre>
          <p style="margin-bottom: 0;">
            Fix these environment variables and refresh the page.
          </p>
        </div>
      `;
    }
    
    throw error;
  }
}