const validateAnswer = (sa, ca) => sa.toLowerCase().trim() === ca.toLowerCase().trim();

function testScoring(answers, questions, negRate) {
  let totalScore = 0;
  let totalPossible = 0;

  for (const q of questions) {
    const studentAnswer = answers[q.id] || "";
    const qMarks = q.marks;
    totalPossible += qMarks;

    const isCorrect = validateAnswer(studentAnswer, q.correct_answer);

    let marksObtained = 0;
    if (isCorrect) {
      marksObtained = qMarks;
    } else if (studentAnswer !== "" && negRate > 0) {
      marksObtained = -(qMarks * (negRate / 100));
    }

    totalScore += marksObtained;
    console.log(`QID: ${q.id} | Answer: ${studentAnswer} | Correct: ${q.correct_answer} | Marks: ${marksObtained}`);
  }

  const finalScore = Math.max(0, totalScore);
  const percentage = (finalScore / totalPossible) * 100;
  return { finalScore, percentage };
}

const mockQuestions = [
  { id: '1', correct_answer: 'A', marks: 10 },
  { id: '2', correct_answer: 'B', marks: 10 },
  { id: '3', correct_answer: 'C', marks: 10 },
];

const mockAnswers = {
  '1': 'A', // Correct (+10)
  '2': 'D', // Wrong (-2.5 if 25%)
  '3': '',  // Skipped (0)
};

const result = testScoring(mockAnswers, mockQuestions, 25);
console.log('Final Result:', result);
if (result.finalScore === 7.5 && result.percentage === 25) {
  console.log('TEST PASSED');
} else {
  console.log('TEST FAILED');
}
