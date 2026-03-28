export default function QuestionCard({
  question,
  visibleOptions,
  selectedOption,
  secondChoice,
  isAnswered,
  correctAnswer,
  onSelect,
  isDoubleChoice,
}) {
  const getOptionClass = (index) => {
    if (visibleOptions && visibleOptions[index] === null) return 'hidden';
    if (isAnswered) {
      if (index === correctAnswer) return 'correct';
      if (index === selectedOption && index !== correctAnswer) return 'wrong';
      if (isDoubleChoice && index === secondChoice && index !== correctAnswer) return 'wrong';
    }
    if (index === selectedOption) return 'selected';
    if (isDoubleChoice && index === secondChoice) return 'selected';
    return '';
  };

  return (
    <div className="question-card">
      <p className="question-text">{question.question}</p>
      <div className="options-grid">
        {question.options.map((option, index) => (
          <button
            key={index}
            className={`option-btn ${getOptionClass(index)}`}
            onClick={() => onSelect(index)}
            disabled={isAnswered || (visibleOptions && visibleOptions[index] === null)}
          >
            <span className="option-label">{String.fromCharCode(65 + index)}.</span>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
