export function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function applyFiftyFifty(question) {
  const wrongIndices = question.options
    .map((_, i) => i)
    .filter(i => i !== question.correct);
  const toRemove = shuffleArray(wrongIndices).slice(0, 2);
  return question.options.map((opt, i) =>
    toRemove.includes(i) ? null : opt
  );
}

export function applySwapQuestion(questions, currentIndex, usedIndices) {
  const available = questions
    .map((_, i) => i)
    .filter(i => i !== currentIndex && !usedIndices.includes(i));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function calculateScore(basePoints = 10) {
  return basePoints;
}
