import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { getAllProgress } from '../db/database';
import CategoryCard from '../components/CategoryCard';

const CATEGORIES = [
  { id: 'india-politics', name: 'India Politics', icon: '🗳️' },
  { id: 'indian-geography', name: 'Indian Geography', icon: '🗺️' },
  { id: 'bollywood', name: 'Bollywood', icon: '🎬' },
  { id: 'cricket', name: 'Cricket', icon: '🏏' },
  { id: 'world-map', name: 'World Map & Countries', icon: '🌍' },
  { id: 'books-authors', name: 'Books & Authors', icon: '📚' },
  { id: 'world-history', name: 'World History', icon: '📜' },
  { id: 'world-flags', name: 'World Flags', icon: '🚩' },
  { id: 'mixed-gk', name: 'Mixed GK', icon: '🧠' },
];

export default function CategoryPage() {
  const { user, logout } = useAuth();
  const { startGame, resetGame } = useGame();
  const navigate = useNavigate();
  const allProgress = getAllProgress(user.username);

  const getProgress = (categoryId) =>
    allProgress.find(p => p.category === categoryId);

  const handleCategoryClick = (category) => {
    const progress = getProgress(category.id);
    const level = progress ? Math.min(progress.level + 1, 10) : 1;
    resetGame();
    startGame(category, level);
    navigate('/quiz');
  };

  return (
    <div className="category-page">
      <header className="category-header">
        <div className="header-title">🏆 QuizArena</div>
        <div className="header-actions">
          <span className="username-badge">👤 {user.username}</span>
          <button className="btn-outline" onClick={() => navigate('/leaderboard')}>🏅 Leaderboard</button>
          <button className="btn-outline" onClick={logout}>Logout</button>
        </div>
      </header>
      <h2 className="section-title">Choose a Category</h2>
      <div className="categories-grid">
        {CATEGORIES.map(cat => (
          <CategoryCard
            key={cat.id}
            category={cat}
            progress={getProgress(cat.id)}
            onClick={() => handleCategoryClick(cat)}
          />
        ))}
      </div>
    </div>
  );
}
