import React from 'react';
import './index.css';

// Ultra-minimal App component to test React in app context
function App() {
  const [message, setMessage] = React.useState('Minimal App Works!');
  
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
          {message}
        </h1>
        
        <button 
          onClick={() => setMessage('React hooks work in App component!')}
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
          Test App useState
        </button>
        
        <button 
          onClick={() => {
            console.log('Will add providers step by step...');
            alert('App component React hooks working! Ready to add complexity.');
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
          Next: Add Providers
        </button>
        
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
          This minimal App component uses React hooks successfully.
        </p>
      </div>
    </div>
  );
}

export default App;