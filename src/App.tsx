import { useState } from 'react';

// Minimal test component to verify React is working
function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>React Test App</h1>
      <p>If you can see this, React is loading correctly.</p>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      <p>Click the button to test useState hook.</p>
    </div>
  );
}

export default App;