import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchLeaderboard } from '../api/client';
import { useState, useEffect } from 'react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard(50)
      .then(data => setLeaderboard(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const rank = leaderboard.findIndex(e => e.username === user.username) + 1;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-card">
        <button className="btn-back" onClick={() => navigate('/categories')}>← Back</button>
        <h2>🏅 Leaderboard</h2>
        {rank > 0
          ? <p className="user-rank">Your rank: #{rank}</p>
          : !loading && <p className="user-rank">Your rank: not yet ranked — play to earn points!</p>
        }
        {loading && <p className="no-data">Loading…</p>}
        {error && <p className="error">{error}</p>}
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className={`leaderboard-row ${entry.username === user.username ? 'current-user' : ''}`}
            >
              <span className="rank-number">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </span>
              <span className="lb-username">{entry.username}</span>
              <span className="lb-score">{entry.totalScore} pts</span>
            </div>
          ))}
          {!loading && leaderboard.length === 0 && !error && (
            <p className="no-data">No scores yet. Start playing!</p>
          )}
        </div>
      </div>
    </div>
  );
}
