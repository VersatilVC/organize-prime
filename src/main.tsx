import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initializeEnvironment } from './lib/env-validation'

// Switch between minimal and full app for debugging
const USE_MINIMAL_APP = false; // Now using full app

try {
  // Validate environment before starting the app
  initializeEnvironment();
  
  const root = createRoot(document.getElementById('root')!)
  
  console.info('🚀 OrganizePrime v3.0 - Restored Full Application', { rendering: true });
  
  root.render(<App />)
  
  console.info('✅ App rendered successfully', { completed: true })
} catch (error) {
  console.error('❌ Failed to render app:', error)
  
  // Fallback HTML if React fails
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui; background: #f8fafc;">
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px;">
          <h1 style="color: #dc2626; margin-bottom: 1rem;">React Failed to Load ❌</h1>
          <p style="color: #6b7280; margin-bottom: 2rem;">There was an error loading the application.</p>
          <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px; font-size: 0.875rem; text-align: left; white-space: pre-wrap;">${error}</pre>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; margin-top: 1rem;">Reload Page</button>
        </div>
      </div>
    `
  }
}