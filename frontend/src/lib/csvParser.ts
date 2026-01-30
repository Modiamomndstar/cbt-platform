import Papa, { type ParseResult as PapaParseResult } from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  valid: boolean;
}

export interface TutorCSVRow {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  subjects?: string;
}

export interface StudentCSVRow {
  studentId: string;
  fullName: string;
  email?: string;
  phone?: string;
  level: string;
}

export interface QuestionCSVRow {
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank';
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  correctAnswer: string;
  marks: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Parse CSV file
export function parseCSV<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: PapaParseResult<T>) => {
        resolve(results.data);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

// Parse Excel file
export function parseExcel<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<T>(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

// Validate tutor CSV data
export function validateTutorCSV(data: TutorCSVRow[]): ParseResult<TutorCSVRow> {
  const errors: string[] = [];
  const validData: TutorCSVRow[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because header is row 1
    
    if (!row.username?.trim()) {
      errors.push(`Row ${rowNum}: Username is required`);
    }
    if (!row.password?.trim()) {
      errors.push(`Row ${rowNum}: Password is required`);
    }
    if (!row.fullName?.trim()) {
      errors.push(`Row ${rowNum}: Full name is required`);
    }

    if (row.username && row.password && row.fullName) {
      validData.push(row);
    }
  });

  return {
    data: validData,
    errors,
    valid: errors.length === 0,
  };
}

// Validate student CSV data
export function validateStudentCSV(data: StudentCSVRow[]): ParseResult<StudentCSVRow> {
  const errors: string[] = [];
  const validData: StudentCSVRow[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.studentId?.trim()) {
      errors.push(`Row ${rowNum}: Student ID is required`);
    }
    if (!row.fullName?.trim()) {
      errors.push(`Row ${rowNum}: Full name is required`);
    }
    if (!row.level?.trim()) {
      errors.push(`Row ${rowNum}: Level/Class is required`);
    }

    if (row.studentId && row.fullName && row.level) {
      validData.push(row);
    }
  });

  return {
    data: validData,
    errors,
    valid: errors.length === 0,
  };
}

// Validate question CSV data
export function validateQuestionCSV(data: QuestionCSVRow[]): ParseResult<QuestionCSVRow> {
  const errors: string[] = [];
  const validData: QuestionCSVRow[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.questionText?.trim()) {
      errors.push(`Row ${rowNum}: Question text is required`);
    }
    if (!row.questionType) {
      errors.push(`Row ${rowNum}: Question type is required`);
    }
    if (!row.correctAnswer?.trim()) {
      errors.push(`Row ${rowNum}: Correct answer is required`);
    }
    if (!row.marks) {
      errors.push(`Row ${rowNum}: Marks is required`);
    }

    // Validate based on question type
    if (row.questionType === 'multiple_choice') {
      if (!row.option1 || !row.option2) {
        errors.push(`Row ${rowNum}: Multiple choice questions require at least 2 options`);
      }
    }

    if (row.questionText && row.questionType && row.correctAnswer && row.marks) {
      validData.push(row);
    }
  });

  return {
    data: validData,
    errors,
    valid: errors.length === 0,
  };
}

// Download CSV template
export function downloadTemplate(type: 'tutors' | 'students' | 'questions'): void {
  let headers: string[] = [];
  let sampleData: Record<string, string>[] = [];

  switch (type) {
    case 'tutors':
      headers = ['username', 'password', 'fullName', 'email', 'phone', 'subjects'];
      sampleData = [
        { username: 'tutor1', password: 'pass123', fullName: 'John Doe', email: 'john@school.edu', phone: '+1234567890', subjects: 'Math,Physics' },
        { username: 'tutor2', password: 'pass456', fullName: 'Jane Smith', email: 'jane@school.edu', phone: '+0987654321', subjects: 'English,History' },
      ];
      break;
    case 'students':
      headers = ['studentId', 'fullName', 'email', 'phone', 'level'];
      sampleData = [
        { studentId: 'STU001', fullName: 'Alice Johnson', email: 'alice@student.edu', phone: '+1111111111', level: 'SS2' },
        { studentId: 'STU002', fullName: 'Bob Williams', email: 'bob@student.edu', phone: '+2222222222', level: 'SS2' },
      ];
      break;
    case 'questions':
      headers = ['questionText', 'questionType', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'marks', 'difficulty'];
      sampleData = [
        { questionText: 'What is 2+2?', questionType: 'multiple_choice', option1: '3', option2: '4', option3: '5', option4: '6', correctAnswer: '1', marks: '5', difficulty: 'easy' },
        { questionText: 'The sky is blue.', questionType: 'true_false', option1: 'True', option2: 'False', option3: '', option4: '', correctAnswer: '0', marks: '2', difficulty: 'easy' },
        { questionText: 'What is the capital of France?', questionType: 'fill_blank', option1: '', option2: '', option3: '', option4: '', correctAnswer: 'Paris', marks: '5', difficulty: 'medium' },
      ];
      break;
  }

  const csv = Papa.unparse({
    fields: headers,
    data: sampleData,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${type}_template.csv`;
  link.click();
}

// Export data to CSV
export function exportToCSV<T>(data: T[], filename: string): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

// Export data to Excel
export function exportToExcel<T>(data: T[], filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
