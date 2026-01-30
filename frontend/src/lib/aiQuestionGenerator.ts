import type { Question } from '@/types';

interface GeneratedQuestion {
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank';
  options: string[];
  correctAnswer: string | number;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if', 'because', 'although', 'though', 'while', 'where', 'when', 'that', 'which', 'who', 'whom', 'whose', 'what', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
  
  const keywords = words.filter(word => 
    word.length > 3 && 
    !stopWords.has(word) &&
    !/^\d+$/.test(word)
  );
  
  return [...new Set(keywords)];
}

// Extract sentences from text
function extractSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);
}

// Generate questions from a sentence
function generateQuestionsFromSentence(sentence: string, topic: string): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const keywords = extractKeywords(sentence);
  
  // Generate multiple choice question
  if (keywords.length >= 4) {
    const keyKeyword = keywords[0];
    const otherKeywords = keywords.slice(1, 4);
    
    questions.push({
      questionText: `What is the significance of ${keyKeyword} in the context of ${topic}?`,
      questionType: 'multiple_choice',
      options: [
        `It is essential for ${otherKeywords[0]}`,
        `It relates to ${otherKeywords[1]}`,
        `It helps with ${otherKeywords[2]}`,
        `All of the above`
      ],
      correctAnswer: 3,
      marks: 5,
      difficulty: 'medium',
    });
  }
  
  // Generate true/false question
  if (sentence.includes('is') || sentence.includes('are')) {
    questions.push({
      questionText: `${sentence}`,
      questionType: 'true_false',
      options: ['True', 'False'],
      correctAnswer: 0,
      marks: 2,
      difficulty: 'easy',
    });
  }
  
  // Generate fill in the blank question
  if (keywords.length > 0) {
    const blankWord = keywords[Math.floor(Math.random() * keywords.length)];
    const blankedSentence = sentence.replace(new RegExp(blankWord, 'i'), '_____');
    
    questions.push({
      questionText: `Fill in the blank: ${blankedSentence}`,
      questionType: 'fill_blank',
      options: [],
      correctAnswer: blankWord,
      marks: 3,
      difficulty: 'medium',
    });
  }
  
  return questions;
}

// Generate questions from learning material
export function generateQuestionsFromMaterial(
  content: string,
  topics: string[],
  count: number = 10
): Omit<Question, 'id' | 'examId'>[] {
  const sentences = extractSentences(content);
  const questions: Omit<Question, 'id' | 'examId'>[] = [];
  const topic = topics[0] || 'this subject';
  
  // Generate questions from different sentences
  for (let i = 0; i < Math.min(count, sentences.length); i++) {
    const sentence = sentences[i % sentences.length];
    const generated = generateQuestionsFromSentence(sentence, topic);
    
    // Take one question type per sentence
    if (generated.length > 0) {
      const selected = generated[i % generated.length];
      questions.push({
        questionText: selected.questionText,
        questionType: selected.questionType,
        options: selected.options,
        correctAnswer: selected.correctAnswer,
        marks: selected.marks,
        difficulty: selected.difficulty,
      });
    }
  }
  
  // If we don't have enough questions, generate generic ones
  while (questions.length < count) {
    const genericQuestions = generateGenericQuestions(topic, count - questions.length);
    questions.push(...genericQuestions);
  }
  
  return questions.slice(0, count);
}

// Generate generic questions when content is insufficient
function generateGenericQuestions(topic: string, count: number): Omit<Question, 'id' | 'examId'>[] {
  const templates = [
    {
      questionText: `What is the primary purpose of ${topic}?`,
      questionType: 'multiple_choice' as const,
      options: [
        'To understand fundamental concepts',
        'To apply theoretical knowledge',
        'To solve practical problems',
        'All of the above'
      ],
      correctAnswer: 3,
      marks: 5,
      difficulty: 'easy' as const,
    },
    {
      questionText: `${topic} is an important area of study.`,
      questionType: 'true_false' as const,
      options: ['True', 'False'],
      correctAnswer: 0,
      marks: 2,
      difficulty: 'easy' as const,
    },
    {
      questionText: `Name one key concept in ${topic}.`,
      questionType: 'fill_blank' as const,
      options: [],
      correctAnswer: 'fundamentals',
      marks: 3,
      difficulty: 'medium' as const,
    },
    {
      questionText: `Which of the following best describes ${topic}?`,
      questionType: 'multiple_choice' as const,
      options: [
        'A theoretical framework',
        'A practical methodology',
        'A comprehensive approach',
        'Both theoretical and practical'
      ],
      correctAnswer: 3,
      marks: 5,
      difficulty: 'medium' as const,
    },
    {
      questionText: `Understanding ${topic} requires both theory and practice.`,
      questionType: 'true_false' as const,
      options: ['True', 'False'],
      correctAnswer: 0,
      marks: 2,
      difficulty: 'easy' as const,
    },
  ];
  
  const result: Omit<Question, 'id' | 'examId'>[] = [];
  for (let i = 0; i < count; i++) {
    result.push(templates[i % templates.length]);
  }
  
  return result;
}

// Generate questions from topics only
export function generateQuestionsFromTopics(
  topics: string[],
  difficulty: 'easy' | 'medium' | 'hard',
  count: number = 10
): Omit<Question, 'id' | 'examId'>[] {
  const questions: Omit<Question, 'id' | 'examId'>[] = [];
  
  const templates: Record<string, Omit<Question, 'id' | 'examId'>[]> = {
    easy: [
      {
        questionText: 'What is the basic definition of {topic}?',
        questionType: 'multiple_choice',
        options: [
          'A complex theoretical concept',
          'A fundamental principle or idea',
          'An advanced methodology',
          'None of the above'
        ],
        correctAnswer: 1,
        marks: 5,
        difficulty: 'easy',
      },
      {
        questionText: '{topic} is important to study.',
        questionType: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 0,
        marks: 2,
        difficulty: 'easy',
      },
    ],
    medium: [
      {
        questionText: 'Which of the following best explains {topic}?',
        questionType: 'multiple_choice',
        options: [
          'It is only theoretical',
          'It has practical applications',
          'It combines theory and practice',
          'It is not widely used'
        ],
        correctAnswer: 2,
        marks: 5,
        difficulty: 'medium',
      },
      {
        questionText: 'Explain one application of {topic}.',
        questionType: 'fill_blank',
        options: [],
        correctAnswer: 'problem solving',
        marks: 5,
        difficulty: 'medium',
      },
    ],
    hard: [
      {
        questionText: 'Analyze the relationship between {topic} and its practical applications.',
        questionType: 'multiple_choice',
        options: [
          'They are completely separate',
          'Theory informs practice only',
          'Practice informs theory only',
          'They are interdependent and evolving'
        ],
        correctAnswer: 3,
        marks: 10,
        difficulty: 'hard',
      },
      {
        questionText: 'Evaluate the significance of {topic} in modern contexts.',
        questionType: 'fill_blank',
        options: [],
        correctAnswer: 'highly significant',
        marks: 10,
        difficulty: 'hard',
      },
    ],
  };
  
  const selectedTemplates = templates[difficulty];
  
  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    const template = selectedTemplates[i % selectedTemplates.length];
    
    questions.push({
      ...template,
      questionText: template.questionText.replace('{topic}', topic),
    });
  }
  
  return questions;
}

// Shuffle array (Fisher-Yates algorithm)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Select random questions from pool
export function selectRandomQuestions(
  questions: Omit<Question, 'id' | 'examId'>[],
  count: number
): Omit<Question, 'id' | 'examId'>[] {
  const shuffled = shuffleArray(questions);
  return shuffled.slice(0, count);
}
