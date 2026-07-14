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
  correctChoiceId: number;
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

// A saved, resumable quiz session (mirrors the QuizSession DB model).
export interface SavedSession {
  id: number;
  mode: QuizMode;
  timeLimitMin: number | null;
  seed: string;
  questionIds: number[];
  answers: Record<string, number>; // questionId -> chosenChoiceId
  current: number;
  remainingSec: number | null;
  finished: boolean;
}
