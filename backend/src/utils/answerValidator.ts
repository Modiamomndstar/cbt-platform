export interface AnswerValidationResult {
  isCorrect: boolean;
  reason?: string;
  requiresManualGrading?: boolean;
}

export interface QuestionOption {
  label?: string;
  text: string;
  isCorrect?: boolean;
}

/**
 * Validate a student's answer based on question type
 */
export const validateAnswer = (
  studentAnswer: string | number | any,
  correctAnswer: string | number | any,
  questionType: string,
  options?: QuestionOption[] | any[]
): AnswerValidationResult => {
  // Normalize inputs
  const normalizeText = (text: any): string => {
    if (text === null || text === undefined) return "";
    return String(text).toLowerCase().trim();
  };

  try {
    switch (questionType) {
      case "multiple_choice":
        return validateMultipleChoice(studentAnswer, correctAnswer, options);

      case "true_false":
        return validateTrueFalse(studentAnswer, correctAnswer);

      case "fill_blank":
        return validateFillBlank(studentAnswer, correctAnswer);

      case "theory":
        return {
          isCorrect: false,
          requiresManualGrading: true,
          reason: "Theory questions require manual grading",
        };

      default:
        return {
          isCorrect: false,
          requiresManualGrading: true,
          reason: `Unsupported question type: ${questionType}. Requires manual review.`,
        };
    }
  } catch (error) {
    console.error("Error in validateAnswer:", error);
    return { isCorrect: false, reason: "Validation error" };
  }
};

function validateMultipleChoice(
  studentAnswer: any,
  correctAnswer: any,
  options?: any[]
): AnswerValidationResult {
  // Normalize both answers
  const student = String(studentAnswer).toLowerCase().trim();
  const correct = String(correctAnswer).toLowerCase().trim();

  // Check if it's an index-based answer (0, 1, 2, etc.)
  if (/^\d+$/.test(correct)) {
    const correctIndex = parseInt(correct);
    const studentIndex = parseInt(student);

    if (!options || !Array.isArray(options)) {
      return {
        isCorrect: false,
        reason: 'Options not provided for index validation'
      };
    }

    if (studentIndex < 0 || studentIndex >= options.length) {
      return {
        isCorrect: false,
        reason: `Invalid option index: ${studentIndex}`
      };
    }

    return { isCorrect: studentIndex === correctIndex };
  }

  // Text-based comparison
  return { isCorrect: student === correct };
}

function validateTrueFalse(
  studentAnswer: any,
  correctAnswer: any
): AnswerValidationResult {
  const student = String(studentAnswer).toLowerCase().trim();
  const correct = String(correctAnswer).toLowerCase().trim();

  // Normalize common true/false representations
  // 0 = True, 1 = False to match frontend index-based system
  const trueValues = ['true', 'yes', '0', 't', 'y'];
  const falseValues = ['false', 'no', '1', 'f', 'n'];

  const isStudentTrue = trueValues.includes(student);
  const isStudentFalse = falseValues.includes(student);
  const isCorrectTrue = trueValues.includes(correct);
  const isCorrectFalse = falseValues.includes(correct);

  if (!(isStudentTrue || isStudentFalse)) {
    return {
      isCorrect: false,
      reason: 'Invalid true/false answer format'
    };
  }

  if (isStudentTrue && isCorrectTrue) return { isCorrect: true };
  if (isStudentFalse && isCorrectFalse) return { isCorrect: true };

  return { isCorrect: false };
}

function validateFillBlank(
  studentAnswer: any,
  correctAnswer: any
): AnswerValidationResult {
  const student = String(studentAnswer).toLowerCase().trim();
  const correct = String(correctAnswer).toLowerCase().trim();

  // Check for exact match first
  if (student === correct) return { isCorrect: true };

  // Allow slight variations (whitespace, punctuation)
  const normalizeText = (text: string) => {
    return text.replace(/\s+/g, ' ').replace(/[.,!?;:'-]/g, '').toLowerCase();
  };

  if (normalizeText(student) === normalizeText(correct)) {
    return { isCorrect: true };
  }

  return { isCorrect: false };
}
