import OpenAI from "openai";

export interface AIQuestionRequest {
  topic: string;
  subject: string;
  numQuestions: number;
  difficulty: "easy" | "medium" | "hard";
  questionType: "multiple_choice" | "true_false" | "theory";
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
        "marks": 5
      }
    ]

    For true_false questions, use options: ["True", "False"]
    For theory questions, options should be an empty array [].`;

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
