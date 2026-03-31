import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { submitScore, updateProgress } from '../api/client';
import { useEffect, useRef } from 'react';

export default function LevelCompletePage() {
  const { user } = useAuth();
  const { currentCategory, currentLevel, levelScore, score, setCurrentLevel, resetLevel } = useGame();
  const navigate = useNavigate();
  const savedRef = useRef(false);

  useEffect(() => {
    if (!currentCategory || savedRef.current || !user) return;
    savedRef.current = true;

    // Submit score and progress to the server in parallel
    Promise.all([
      submitScore(levelScore, currentCategory.id, currentLevel),
      updateProgress(currentCategory.id, currentLevel, levelScore),
    ]).catch(err => console.error('Failed to save progress:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentCategory) {
    navigate('/categories');
    return null;
  }

  const handleNextLevel = () => {
    const nextLevel = currentLevel + 1;
    setCurrentLevel(nextLevel);
    resetLevel();
    navigate('/quiz');
  };

  return (
    <div className="result-page">
      <div className="result-card">
        <div className="result-icon">🎉</div>
        <h2>Level Complete!</h2>
        <p className="result-category">{currentCategory.icon} {currentCategory.name}</p>
        <div className="result-stats">
          <div className="stat">
            <span className="stat-label">Level Score</span>
            <span className="stat-value">+{levelScore}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{currentLevel}/10</span>
          </div>
        </div>
        <div className="result-actions">
          {currentLevel < 10 && (
            <button className="btn-primary" onClick={handleNextLevel}>
              Next Level →
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate('/categories')}>
            Back to Categories
          </button>
        </div>
      </div>
    </div>
  );
}
