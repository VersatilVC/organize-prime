import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './index.css';

// Simple test pages
function HomePage() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Home Page</h1>
      <p className="mb-4">React is working correctly!</p>
      <button 
        onClick={() => setCount(count + 1)}
        className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
      >
        Count: {count}
      </button>
      <Link to="/auth" className="bg-green-500 text-white px-4 py-2 rounded">
        Go to Auth
      </Link>
    </div>
  );
}

function AuthPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Page</h1>
      <p className="mb-4">Authentication page loaded successfully!</p>
      <Link to="/" className="bg-blue-500 text-white px-4 py-2 rounded">
        Back to Home
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;