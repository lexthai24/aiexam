export interface ChoiceDTO {
  id: number;
  label: string;
  text: string;
}

export interface QuestionDTO {
  id: number;
  number: number;
  category: string;
  text: string;
  choices: ChoiceDTO[];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctLabel: string;
  correctText: string;
}

export interface ExplanationResult {
  explanation: string;
  model: string;
  cached: boolean;
}

export interface User {
  userId: number;
  name: string;
}

// practice: instant reveal + AI explanation, untimed
// exam:     answer straight through, no reveal until finished, optional timer
// review:   only previously-wrong questions, instant reveal (like practice)
export type QuizMode = "practice" | "exam" | "review";

export interface QuizConfig {
  mode: QuizMode;
  // Time limit in minutes for exam mode. undefined = untimed.
  timeLimitMin?: number;
}
