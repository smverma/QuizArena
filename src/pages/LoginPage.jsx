import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { authenticate } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter a username'); return; }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) { setError('PIN must be 4 digits'); return; }
    setLoading(true);
    setError('');
    const result = await authenticate(username.trim(), pin);
    setLoading(false);
    if (result.success) navigate('/categories');
    else setError(result.error);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">🏆 QuizArena</div>
        <h2>Welcome to QuizArena</h2>
        <p className="welcome-text">Enter your username and 4-digit PIN. New here? Your account will be created automatically.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            disabled={loading}
          />
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4-digit PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            maxLength={4}
            disabled={loading}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait…' : 'Play →'}
          </button>
        </form>
      </div>
    </div>
  );
}
