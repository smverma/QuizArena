import { createContext, useContext, useState } from 'react';

const GameContext = createContext();

export function GameProvider({ children }) {
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [levelScore, setLevelScore] = useState(0);

  const startGame = (category, level) => {
    setCurrentCategory(category);
    setCurrentLevel(level);
    setLives(3);
    setLevelScore(0);
  };

  const addScore = (points) => {
    setScore(prev => prev + points);
    setLevelScore(prev => prev + points);
  };

  const loseLife = () => {
    setLives(prev => prev - 1);
  };

  const resetLevel = () => {
    setLives(3);
    setLevelScore(0);
  };

  const resetGame = () => {
    setCurrentCategory(null);
    setCurrentLevel(1);
    setScore(0);
    setLives(3);
    setLevelScore(0);
  };

  return (
    <GameContext.Provider value={{
      currentCategory,
      currentLevel,
      score,
      lives,
      levelScore,
      startGame,
      addScore,
      loseLife,
      resetLevel,
      resetGame,
      setCurrentLevel,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
