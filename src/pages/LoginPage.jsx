import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('username');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { authenticate, userExists } = useAuth();
  const navigate = useNavigate();

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter a username'); return; }
    setLoading(true);
    setError('');
    try {
      const exists = await userExists(username.trim());
      setIsNewUser(!exists);
      setStep(exists ? 'pin' : 'register');
    } catch {
      setError('Unable to reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await authenticate(username.trim(), pin);
    setLoading(false);
    if (result.success) navigate('/categories');
    else setError(result.error);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (pin.length !== 4 || !/^\d+$/.test(pin)) { setError('PIN must be 4 digits'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }
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
        <h2>{isNewUser && step === 'register' ? 'Create Account' : 'Welcome Back'}</h2>

        {step === 'username' && (
          <form onSubmit={handleUsernameSubmit}>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              disabled={loading}
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'pin' && (
          <form onSubmit={handleLogin}>
            <p className="welcome-text">Welcome back, <strong>{username}</strong>!</p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={4}
              autoFocus
              disabled={loading}
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
            <button type="button" className="btn-secondary" disabled={loading} onClick={() => { setStep('username'); setPin(''); setError(''); }}>Back</button>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister}>
            <p className="welcome-text">New user: <strong>{username}</strong></p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="Choose 4-digit PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={4}
              autoFocus
              disabled={loading}
            />
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              maxLength={4}
              disabled={loading}
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account…' : 'Register'}
            </button>
            <button type="button" className="btn-secondary" disabled={loading} onClick={() => { setStep('username'); setPin(''); setConfirmPin(''); setError(''); }}>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
