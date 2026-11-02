export type Grade = 1 | 2;
export type Region = 'asia' | 'europe' | 'africa' | 'namerica' | 'samerica' | 'oceania';

export interface Country {
  id: string;
  name: string;
  reading: string;
  official: string;
  aliases: string[];
  region: Region;
  capital: string;
  flag: string;
  meaning: string;
  symbols: string[];
  colors: string[];
  similar: string[];
  tip: string;
  animal?: string;
  plant?: string;
  item?: string;
  stars?: number;
}

export interface Choice {
  id: string;
  text?: string;
  flag?: string;
}

export interface Question {
  id: string;
  grade: Grade;
  format: 'choice' | 'written';
  type: string;
  prompt: string;
  flag?: string;
  choices?: Choice[];
  answer?: string;
  acceptedAnswers?: string[];
  answerText: string;
  explanation: string;
  countryIds: string[];
}

export interface Answer {
  questionId: string;
  /** 選択式は選んだ選択肢のID、記述式は入力した文字。未回答は null */
  value: string | null;
  correct: boolean;
}

export type ExamMode = 'exam' | 'mini' | 'retry';

export interface ExamResult {
  id: string;
  userId: string;
  grade: Grade;
  mode: ExamMode;
  score: number;
  total: number;
  passed: boolean;
  timeMs: number;
  timedOut: boolean;
  date: string;
  answers: Answer[];
}

export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export interface Settings {
  timeLimitMin: Record<Grade, number>;
  sound: boolean;
  instantFeedback: boolean;
  /** 書く問題の入力方法：アプリの50音キーボード / iPadのキーボード（音声入力もできる） */
  inputMode: InputMode;
}

export type InputMode = 'kana' | 'native';
