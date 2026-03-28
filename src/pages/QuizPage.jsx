import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { soundManager } from '../utils/soundManager';
import { applyFiftyFifty, applySwapQuestion } from '../utils/quizEngine';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import LifelineButtons from '../components/LifelineButtons';

const categoryModules = {
  'india-politics': () => import('../data/india-politics.json'),
  'indian-geography': () => import('../data/indian-geography.json'),
  'bollywood': () => import('../data/bollywood.json'),
  'cricket': () => import('../data/cricket.json'),
  'world-map': () => import('../data/world-map.json'),
  'books-authors': () => import('../data/books-authors.json'),
  'world-history': () => import('../data/world-history.json'),
  'world-flags': () => import('../data/world-flags.json'),
  'mixed-gk': () => import('../data/mixed-gk.json'),
};

const QUESTION_TIME = 15;

export default function QuizPage() {
  const { user } = useAuth();
  const { currentCategory, currentLevel, score, addScore, loseLife } = useGame();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selectedOption, setSelectedOption] = useState(null);
  const [secondChoice, setSecondChoice] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [visibleOptions, setVisibleOptions] = useState(null);
  const [lifelines, setLifelines] = useState({ fiftyFifty: false, doubleChoice: false, swapQuestion: false });
  const [activeLifeline, setActiveLifeline] = useState(null);
  const [usedQuestionIndices, setUsedQuestionIndices] = useState([0]);
  const [currentLives, setCurrentLives] = useState(3);

  const timerRef = useRef(null);
  const answeredRef = useRef(false);

  useEffect(() => {
    if (!currentCategory) { navigate('/categories'); return; }
    const loader = categoryModules[currentCategory.id];
    if (!loader) { navigate('/categories'); return; }
    loader().then(module => {
      const data = module.default;
      const levelData = data.levels.find(l => l.level === currentLevel);
      if (levelData) {
        setQuestions(levelData.questions);
        setUsedQuestionIndices([0]);
      }
    });
  }, [currentCategory, currentLevel, navigate]);

  const goNext = useCallback(() => {
    setCurrentIndex(prev => {
      const next = prev + 1;
      if (next >= 10) {
        soundManager.levelComplete();
        navigate('/level-complete');
        return prev;
      }
      return next;
    });
    setSelectedOption(null);
    setSecondChoice(null);
    setIsAnswered(false);
    setVisibleOptions(null);
    setActiveLifeline(null);
    answeredRef.current = false;
  }, [navigate]);

  const handleTimeout = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setIsAnswered(true);
    soundManager.wrong();
    loseLife();
    setCurrentLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setTimeout(() => navigate('/gameover'), 1500);
      } else {
        setTimeout(goNext, 1500);
      }
      return newLives;
    });
  }, [loseLife, navigate, goNext]);

  useEffect(() => {
    if (questions.length === 0) return;
    answeredRef.current = false;
    setTimeLeft(QUESTION_TIME);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, questions, handleTimeout]);

  const handleOptionSelect = (index) => {
    if (isAnswered || answeredRef.current) return;
    const currentQ = questions[currentIndex];

    if (activeLifeline === 'doubleChoice') {
      if (selectedOption === null) {
        setSelectedOption(index);
        return;
      }
      if (index === selectedOption) return;
      clearInterval(timerRef.current);
      answeredRef.current = true;
      setSecondChoice(index);
      setIsAnswered(true);
      const isCorrect = index === currentQ.correct || selectedOption === currentQ.correct;
      if (isCorrect) {
        soundManager.correct();
        addScore(10);
        setTimeout(goNext, 1500);
      } else {
        soundManager.wrong();
        loseLife();
        setCurrentLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) setTimeout(() => navigate('/gameover'), 1500);
          else setTimeout(goNext, 1500);
          return newLives;
        });
      }
      return;
    }

    clearInterval(timerRef.current);
    answeredRef.current = true;
    setSelectedOption(index);
    setIsAnswered(true);

    if (index === currentQ.correct) {
      soundManager.correct();
      addScore(10);
      setTimeout(goNext, 1000);
    } else {
      soundManager.wrong();
      loseLife();
      setCurrentLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) setTimeout(() => navigate('/gameover'), 1500);
        else setTimeout(goNext, 1500);
        return newLives;
      });
    }
  };

  const handleLifeline = (type) => {
    if (lifelines[type] || isAnswered) return;
    setLifelines(prev => ({ ...prev, [type]: true }));
    const currentQ = questions[currentIndex];

    if (type === 'fiftyFifty') {
      setVisibleOptions(applyFiftyFifty(currentQ));
    } else if (type === 'doubleChoice') {
      setActiveLifeline('doubleChoice');
    } else if (type === 'swapQuestion') {
      const newIndex = applySwapQuestion(questions, currentIndex, usedQuestionIndices);
      if (newIndex !== null) {
        setUsedQuestionIndices(prev => [...prev, newIndex]);
        clearInterval(timerRef.current);
        setCurrentIndex(newIndex);
        setSelectedOption(null);
        setSecondChoice(null);
        setIsAnswered(false);
        setVisibleOptions(null);
        setActiveLifeline(null);
        answeredRef.current = false;
      }
    }
  };

  if (questions.length === 0) {
    return <div className="loading">Loading questions...</div>;
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <div className="quiz-meta">
          <span className="category-label">{currentCategory.icon} {currentCategory.name}</span>
          <span className="level-label">Level {currentLevel}</span>
        </div>
        <div className="quiz-stats">
          <div className="lives">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={`heart ${i < currentLives ? 'alive' : 'lost'}`}>❤️</span>
            ))}
          </div>
          <div className="score-display">Score: {score}</div>
        </div>
      </div>

      <div className="question-number">
        Question {currentIndex + 1}/10
      </div>

      <Timer timeLeft={timeLeft} maxTime={QUESTION_TIME} />

      <QuestionCard
        question={currentQ}
        visibleOptions={visibleOptions}
        selectedOption={selectedOption}
        secondChoice={secondChoice}
        isAnswered={isAnswered}
        correctAnswer={currentQ.correct}
        onSelect={handleOptionSelect}
        isDoubleChoice={activeLifeline === 'doubleChoice'}
      />

      <LifelineButtons
        lifelines={lifelines}
        onUse={handleLifeline}
        disabled={isAnswered}
      />

      {activeLifeline === 'doubleChoice' && !isAnswered && (
        <p className="lifeline-hint">
          {selectedOption === null ? 'Select your first choice' : 'Select your second choice'}
        </p>
      )}
    </div>
  );
}
