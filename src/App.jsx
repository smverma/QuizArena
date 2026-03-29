import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import LoginPage from './pages/LoginPage';
import CategoryPage from './pages/CategoryPage';
import QuizPage from './pages/QuizPage';
import LevelCompletePage from './pages/LevelCompletePage';
import GameOverPage from './pages/GameOverPage';
import LeaderboardPage from './pages/LeaderboardPage';
import './App.css';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/categories" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
      <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
      <Route path="/level-complete" element={<ProtectedRoute><LevelCompletePage /></ProtectedRoute>} />
      <Route path="/gameover" element={<ProtectedRoute><GameOverPage /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <GameProvider>
          <AppRoutes />
        </GameProvider>
      </AuthProvider>
    </Router>
  );
}
