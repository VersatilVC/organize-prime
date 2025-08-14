import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Test if the basic test works first
function TestApp() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#1f2937', marginBottom: '1rem' }}>
          React Test ✅ (Count: {count})
        </h1>
        
        <button 
          onClick={() => setCount(c => c + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test useState
        </button>
        
        <button 
          onClick={() => {
            console.log('Loading full app...');
            window.location.hash = 'load-app';
            window.location.reload();
          }}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Load Full App
        </button>
        
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
          If useState works, click "Load Full App" to test the main application
        </p>
      </div>
    </div>
  )
}

// Check if we should load the full app or just the test
const shouldLoadFullApp = window.location.hash === '#load-app';

try {
  const root = createRoot(document.getElementById('root')!)
  
  if (shouldLoadFullApp) {
    console.log('Loading full OrganizePrime app...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } else {
    console.log('Loading React test app...');
    root.render(
      <StrictMode>
        <TestApp />
      </StrictMode>
    )
  }
  
  console.log('✅ App rendered successfully')
} catch (error) {
  console.error('❌ Failed to render app:', error)
  
  // Fallback HTML if React fails
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui; background: #f8fafc;">
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px;">
          <h1 style="color: #dc2626; margin-bottom: 1rem;">React Failed to Load ❌</h1>
          <p style="color: #6b7280; margin-bottom: 2rem;">React hooks are not available. This indicates a fundamental React loading issue.</p>
          <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px; font-size: 0.875rem; text-align: left; white-space: pre-wrap;">${error}</pre>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; margin-top: 1rem;">Reload Page</button>
        </div>
      </div>
    `
  }
}