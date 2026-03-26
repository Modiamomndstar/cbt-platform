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
  if (!options || !Array.isArray(options) || options.length === 0) {
    // If no options, fall back to simple text comparison
    const student = String(studentAnswer || "").toLowerCase().trim();
    const correct = String(correctAnswer || "").toLowerCase().trim();
    return { isCorrect: student === correct && student !== "" };
  }

  const normalize = (val: any) => String(val || "").toLowerCase().trim();

  // 1. Resolve student answer to text if it's an index
  let studentText = normalize(studentAnswer);
  if (/^\d+$/.test(studentText)) {
    const idx = parseInt(studentText);
    if (idx >= 0 && idx < options.length) {
      const opt = options[idx];
      studentText = normalize(typeof opt === 'string' ? opt : (opt.text || opt.label || studentText));
    }
  }

  // 2. Resolve correct answer to text if it's an index
  let correctText = normalize(correctAnswer);
  if (/^\d+$/.test(correctText)) {
    const idx = parseInt(correctText);
    if (idx >= 0 && idx < options.length) {
      const opt = options[idx];
      correctText = normalize(typeof opt === 'string' ? opt : (opt.text || opt.label || String(opt)));
    }
  }

  // 3. Final comparison
  return { 
    isCorrect: studentText === correctText && studentText !== "",
    reason: studentText === correctText ? undefined : `Selected "${studentText}", expected "${correctText}"`
  };
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
