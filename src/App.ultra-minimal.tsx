import * as React from 'react';

// Ultra minimal app with NO imports except React
function UltraMinimalApp() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <h1 style={{ color: '#1f2937', marginBottom: '1rem' }}>
        🧪 Ultra Minimal Test
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Counter: <strong>{count}</strong>
      </p>
      <button 
        onClick={() => setCount(c => c + 1)} 
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          cursor: 'pointer'
        }}
      >
        Increment
      </button>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.8 }}>
        If this works without loops, the issue is in our dependencies
      </p>
    </div>
  );
}

export default UltraMinimalApp;