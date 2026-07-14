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
