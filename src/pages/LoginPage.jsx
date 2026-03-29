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
  const { login, register, userExists } = useAuth();
  const navigate = useNavigate();

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter a username'); return; }
    const exists = userExists(username.trim());
    setIsNewUser(!exists);
    setStep(exists ? 'pin' : 'register');
    setError('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const result = login(username.trim(), pin);
    if (result.success) navigate('/categories');
    else setError(result.error);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (pin.length !== 4 || !/^\d+$/.test(pin)) { setError('PIN must be 4 digits'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }
    const result = register(username.trim(), pin);
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
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary">Continue</button>
          </form>
        )}

        {step === 'pin' && (
          <form onSubmit={handleLogin}>
            <p className="welcome-text">Welcome back, <strong>{username}</strong>!</p>
            <input
              type="password"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={4}
              autoFocus
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary">Login</button>
            <button type="button" className="btn-secondary" onClick={() => { setStep('username'); setPin(''); setError(''); }}>Back</button>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister}>
            <p className="welcome-text">New user: <strong>{username}</strong></p>
            <input
              type="password"
              placeholder="Choose 4-digit PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={4}
              autoFocus
            />
            <input
              type="password"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              maxLength={4}
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary">Register</button>
            <button type="button" className="btn-secondary" onClick={() => { setStep('username'); setPin(''); setConfirmPin(''); setError(''); }}>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
