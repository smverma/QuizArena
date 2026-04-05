import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { authenticate, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter a username'); return; }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) { setError('PIN must be 4 digits'); return; }
    setLoading(true);
    setError('');
    setServerError(false);
    const result = await authenticate(username.trim(), pin);
    setLoading(false);
    if (result.success) {
      navigate('/categories');
    } else if (result.isServerError) {
      setServerError(true);
    } else {
      setError(result.error);
    }
  };

  const handlePlayAsGuest = () => {
    loginAsGuest();
    navigate('/categories');
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
          {serverError && (
            <div className="server-error-banner">
              <p>⚠️ The server is currently unavailable. Your progress and scores <strong>cannot be saved</strong> right now.</p>
              <p>You can play as a guest and continue with the quiz, but results won't be persisted.</p>
              <button type="button" className="btn-secondary" onClick={handlePlayAsGuest}>
                Play as Guest →
              </button>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait…' : 'Play →'}
          </button>
        </form>
        <div className="guest-divider">
          <span>or</span>
        </div>
        <button type="button" className="btn-guest" onClick={handlePlayAsGuest}>
          Play as Guest (no account needed)
        </button>
        <p className="guest-note">Guest scores and progress won't be saved.</p>
      </div>
    </div>
  );
}
