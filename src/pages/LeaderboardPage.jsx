import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard, getUserRank } from '../db/database';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const leaderboard = getLeaderboard();
  const rank = getUserRank(user.username);

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-card">
        <button className="btn-back" onClick={() => navigate('/categories')}>← Back</button>
        <h2>🏅 Leaderboard</h2>
        <p className="user-rank">Your rank: #{rank}</p>
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.username}
              className={`leaderboard-row ${entry.username === user.username ? 'current-user' : ''}`}
            >
              <span className="rank-number">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </span>
              <span className="lb-username">{entry.username}</span>
              <span className="lb-score">{entry.total_score} pts</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="no-data">No scores yet. Start playing!</p>
          )}
        </div>
      </div>
    </div>
  );
}
