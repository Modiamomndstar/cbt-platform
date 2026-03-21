import OpenAI from "openai";

export interface AIQuestionRequest {
  topic: string;
  subject: string;
  numQuestions: number;
  difficulty: "easy" | "medium" | "hard";
  questionType: "multiple_choice" | "true_false" | "theory" | "fill_blank";
}

export interface AIQuestionResponse {
  questionText: string;
  options: string[];
  correctAnswer: string;
  marks: number;
}

export interface AIResultExplanationRequest {
  studentName: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  missedQuestions: Array<{
    text: string;
    studentAnswer: string;
    correctAnswer: string;
  }>;
}

export interface AICohortAnalysisRequest {
  examTitle: string;
  totalStudents: number;
  averageScorePercentage: number;
  highestScorePercentage: number;
  lowestScorePercentage: number;
  topicPerformance: Array<{
    topic: string;
    averageScorePercentage: number;
  }>;
  mostMissedQuestions: Array<{
    questionText: string;
    topic: string;
    missRate: number;
  }>;
}

export interface AIStudentFeedbackRequest {
  studentName: string;
  examTitle: string;
  scorePercentage: number;
  classAveragePercentage: number;
  strongTopics: string[];
  weakTopics: string[];
}

export interface AISyllabusResponse {
  modules: Array<{
    title: string;
    description: string;
    subtopics?: string[]; // Nested subtopics
    lessons: string[];    // Top-level lessons for the module
  }>;
}

export interface AILessonContentResponse {
  title: string;
  content: string; // Markdown
  keyTakeaways: string[];
  suggestedQuizQuestions: Array<{
    question: string;
    answer: string;
  }>;
}

export interface AIStudyPlanRequest {
  studentName: string;
  academicWeekLabel: string;
  courses: Array<{
    title: string;
    focusModules: string[];
  }>;
}

export interface AIStudyPlanResponse {
  weeklyOverview: string;
  dailySchedule: Array<{
    day: string;
    tasks: string[];
    priority: 'low' | 'medium' | 'high';
  }>;
}

class AIService {
  private client: OpenAI | null = null;
  private model: string;

  constructor() {
    this.model = process.env.AI_MODEL || "gpt-3.5-turbo";
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
      });
    }
  }

  private isAvailable(): boolean {
    return !!this.client;
  }

  async generateQuestions(req: AIQuestionRequest): Promise<AIQuestionResponse[]> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const prompt = `Generate ${req.numQuestions} ${req.difficulty} difficulty ${req.questionType} questions for ${req.subject} on the topic "${req.topic}".

    Return ONLY a valid JSON array in this exact format:
    [
      {
        "questionText": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A",
        "marks": ${req.questionType === 'true_false' ? 2 : req.questionType === 'multiple_choice' ? 3 : 5}
      }
    ]

    STRICT RULES:
    1. For true_false questions: use options: ["True", "False"]. Marks MUST be 2.
    2. For multiple_choice questions: marks MUST be 3.
    3. For fill_blank questions: options MUST be an empty array []. marks MUST be 5.
    4. For theory questions: options MUST be an empty array []. marks MUST be 5.
    5. The correctAnswer for fill_blank must be the exact text.`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are a helpful educational assistant that generates exam questions.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "[]";
    return this.parseJSON(responseText);
  }

  async explainResult(req: AIResultExplanationRequest): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const missedCount = req.missedQuestions.length;
    let missedDetails = req.missedQuestions
      .map((q, i) => `Q${i + 1}: ${q.text}\nYour Answer: ${q.studentAnswer}\nCorrect Answer: ${q.correctAnswer}`)
      .join("\n\n");

    const prompt = `Student Name: ${req.studentName}
    Exam: ${req.examTitle}
    Score: ${req.score}/${req.totalMarks}

    Missed Questions Details:
    ${missedDetails}

    Analyze the performance and provide a balanced explanation.
    1. Celebrate the correct answers.
    2. Gently explain why the missed answers were incorrect and the logic behind the correct ones.
    3. Provide 2-3 study tips based on the missed topics.
    Keep the tone encouraging and academic.`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are a personal academic coach for students. Your goal is to help them learn from their mistakes and improve.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content || "No analysis available.";
  }

  async explainQuestion(question: string, studentAnswer: string, correctAnswer: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const prompt = `Question: ${question}
    Student Answer: ${studentAnswer}
    Correct Answer: ${correctAnswer}

    Explain step-by-step why the correct answer is right and why the student's answer was wrong (if applicable). Use simple, clear language.`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are a tutor's assistant explaining exam solutions to a student.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content || "No explanation available.";
  }

  async analyzeCohortPerformance(req: AICohortAnalysisRequest): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const topicPerfStr = req.topicPerformance.map(t => `- ${t.topic}: ${t.averageScorePercentage.toFixed(1)}% avg`).join('\n');
    const missedQuestionsStr = req.mostMissedQuestions.map(q => `- Question: "${q.questionText}" (Topic: ${q.topic}, Miss Rate: ${(q.missRate * 100).toFixed(1)}%)`).join('\n');

    const prompt = `Exam: ${req.examTitle}\nTotal Students: ${req.totalStudents}\nAverage Score: ${req.averageScorePercentage.toFixed(1)}%\nHighest Score: ${req.highestScorePercentage.toFixed(1)}%\nLowest Score: ${req.lowestScorePercentage.toFixed(1)}%\n\nPerformance by Topic:\n${topicPerfStr}\n\nMost Missed Questions:\n${missedQuestionsStr}\n\nAnalyze this data and provide a 3-paragraph report formatted in Markdown:\n1. Overall class performance summary.\n2. The top 3 knowledge gaps (topics where the class struggled most).\n3. Three actionable teaching recommendations for the tutor to address these gaps before the next exam.`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert Educational Analyst. Analyze exam performance data and provide actionable recommendations for teachers.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content || "No analysis available.";
  }

  async generateStudentFeedback(req: AIStudentFeedbackRequest): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const prompt = `Student: ${req.studentName}\nExam: ${req.examTitle}\nStudent's Score: ${req.scorePercentage.toFixed(1)}%\nClass Average: ${req.classAveragePercentage.toFixed(1)}%\nStrong Topics: ${req.strongTopics.join(', ')}\nWeak Topics: ${req.weakTopics.join(', ')}\n\nAct as a supportive, encouraging tutor. Write a personalized paragraph of feedback for this student using Markdown. Start by celebrating their strengths, gently outline the areas they need to work on, and give them two specific, practical study tips based on their weakest topics.`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are a personal academic coach providing supportive and constructive feedback to students based on their exam performance.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content || "No feedback available.";
  }

  async generateCourseSyllabus(topic: string, subject: string): Promise<AISyllabusResponse> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const prompt = `Create a comprehensive 5-module course syllabus for the subject "${subject}" specifically on the topic "${topic}".
    
    The structure should be hierarchical:
    1. Each module is a major topic.
    2. Each module can have optional "subtopics" (sub-modules).
    3. Each module (and its subtopics) contains specific lesson titles.
    
    For each module, provide:
    1. A clear title.
    2. A brief 1-sentence description.
    3. A list of 2-3 subtopcs (optional).
    4. Exactly 3 key lesson titles.

    Return ONLY a valid JSON object in this exact format:
    {
      "modules": [
        {
          "title": "Module Title",
          "description": "Short description",
          "subtopics": ["Subtopic A", "Subtopic B"],
          "lessons": ["Lesson 1 Title", "Lesson 2 Title", "Lesson 3 Title"]
        }
      ]
    }`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert curriculum designer. Your goal is to create logical, high-quality learning paths.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "{}";
    return this.parseJSON(responseText);
  }

  async generateIntegratedExam(topic: string, courseContent: string, numQuestions: number = 10): Promise<AIQuestionResponse[]> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const prompt = `Generate a comprehensive ${numQuestions}-question exam for the topic "${topic}" based ONLY on the following lesson content:
    
    --- CONTENT START ---
    ${courseContent.substring(0, 4000)} 
    --- CONTENT END ---
    
    Return ONLY a valid JSON array in this exact format:
    [
      {
        "questionText": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A",
        "marks": 5
      }
    ]
    
    STRICT RULES:
    1. Every question MUST be directly answerable from the provided content.
    2. Ensure a mix of conceptual and factual questions.
    3. Options must be plausible but only one correct.`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert examiner. You generate high-quality assessments based strictly on provided curriculum content.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "[]";
    return this.parseJSON(responseText);
  }

  async generateLessonContent(moduleTitle: string, lessonTitle: string, topic: string): Promise<AILessonContentResponse> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const prompt = `Write a detailed educational lesson for "${lessonTitle}" which is part of the module "${moduleTitle}" in the broader topic of "${topic}".
    
    The content should be:
    1. Educational, engaging, and clear.
    2. Formatted in clean Markdown (use headers, bolding, and lists).
    3. Approximately 400-600 words.
    
    Also provide:
    1. Three key takeaways.
    2. Two suggested quiz questions (with answers) for this specific lesson.

    Return ONLY a valid JSON object in this exact format:
    {
      "title": "${lessonTitle}",
      "content": "Full markdown content here...",
      "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
      "suggestedQuizQuestions": [
        { "question": "Q1", "answer": "A1" },
        { "question": "Q2", "answer": "A2" }
      ]
    }`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are a professional educator. You write clear, informative, and engaging lesson content.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "{}";
    return this.parseJSON(responseText);
  }

  async learningAssistantChat(lessonContent: string, userMessage: string, history: any[]): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const messages: any[] = [
      {
        role: "system",
        content: `You are an AI Learning Assistant. Your goal is to help students understand the following lesson content:\n\n${lessonContent}\n\nSTRICT RULES:
        1. ONLY answer questions related to this lesson or the broader subject.
        2. If a student asks something irrelevant, politely redirect them to the lesson.
        3. Explain complex concepts using analogies.
        4. Be encouraging and patient.`,
      },
      ...history.slice(-6), // Keep last 3 turns
      { role: "user", content: userMessage }
    ];

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
    });

    return completion.choices[0].message.content || "I'm sorry, I couldn't process that. How else can I help with this lesson?";
  }

  async generateStudyPlan(req: AIStudyPlanRequest): Promise<AIStudyPlanResponse> {
    if (!this.isAvailable()) {
      throw new Error("AI Service not configured");
    }

    const coursesStr = req.courses.map(c => `- ${c.title}: ${c.focusModules.join(', ')}`).join('\n');

    const prompt = `Student: ${req.studentName}
    Current Academic Week: ${req.academicWeekLabel}
    Enrolled Courses & Active Modules:
    ${coursesStr}

    Generate a personalized weekly study plan (Mon-Fri) for this student. 
    Focus on the modules specifically assigned to this academic week.

    Return ONLY a valid JSON object in this exact format:
    {
      "weeklyOverview": "A brief encouraging summary for the week.",
      "dailySchedule": [
        {
          "day": "Monday",
          "tasks": ["Review Lesson 1 of Maths", "Complete Science Quiz"],
          "priority": "high"
        }
      ]
    }`;

    const completion = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an AI Academic Planner. You help students organize their time and stay on top of their curriculum.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "{}";
    return this.parseJSON(responseText);
  }

  private parseJSON(text: string): any {
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch =
        text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/```\n([\s\S]*?)\n```/) ||
        text.match(/\[([\s\S]*)\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      throw new Error("Could not parse AI response as JSON");
    }
  }
}

export const aiService = new AIService();
