import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';

export default function GameOverPage() {
  const { user } = useAuth();
  const { currentCategory, currentLevel, score, resetLevel, startGame } = useGame();
  const navigate = useNavigate();

  const handleRetry = () => {
    if (currentCategory) {
      resetLevel();
      startGame(currentCategory, currentLevel);
      navigate('/quiz');
    } else {
      navigate('/categories');
    }
  };

  return (
    <div className="result-page">
      <div className="result-card gameover">
        <div className="result-icon">💔</div>
        <h2>Game Over</h2>
        <div className="result-stats">
          {user && (
            <div className="stat">
              <span className="stat-label">Player</span>
              <span className="stat-value">{user.username}</span>
            </div>
          )}
          {currentCategory && (
            <div className="stat">
              <span className="stat-label">Category</span>
              <span className="stat-value">{currentCategory.icon} {currentCategory.name}</span>
            </div>
          )}
          {currentCategory && (
            <div className="stat">
              <span className="stat-label">Level</span>
              <span className="stat-value">{currentLevel}</span>
            </div>
          )}
          <div className="stat">
            <span className="stat-label">Final Score</span>
            <span className="stat-value">{score}</span>
          </div>
        </div>
        <div className="result-actions">
          <button className="btn-primary" onClick={handleRetry}>
            🔄 Retry Level
          </button>
          <button className="btn-secondary" onClick={() => navigate('/categories')}>
            Back to Categories
          </button>
        </div>
      </div>
    </div>
  );
}
