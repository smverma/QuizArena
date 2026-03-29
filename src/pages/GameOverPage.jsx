import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function GameOverPage() {
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
        {currentCategory && (
          <p className="result-category">{currentCategory.icon} {currentCategory.name} - Level {currentLevel}</p>
        )}
        <div className="result-stats">
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
