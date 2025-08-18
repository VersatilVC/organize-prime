import { createRoot } from 'react-dom/client';
import { useState } from 'react';

// Completely isolated test component with NO imports from our codebase
function IsolatedTest() {
  const [clicks, setClicks] = useState(0);
  
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>🔬 Completely Isolated Test</h1>
      <p>Clicks: {clicks}</p>
      <button 
        onClick={() => setClicks(c => c + 1)}
        style={{ padding: '1rem', fontSize: '1rem', background: '#007acc', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Click Me
      </button>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
        If this shows NO Supabase logs, the issue is in our module dependencies
      </p>
    </div>
  );
}

// Render directly without any other imports
const root = createRoot(document.getElementById('root')!);
root.render(<IsolatedTest />);