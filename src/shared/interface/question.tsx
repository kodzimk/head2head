import type { User } from './user';

export interface Question {
  question: string;
  answers: Array<{ label: string; text: string }>;
  correctAnswer: string;
  difficulty: string;
}

export interface TrainingQuestion extends Question {
  // Additional training-specific properties can be added here
}

export interface BattleQuestion extends Question {
  // Additional battle-specific properties can be added here
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  created_at: string;
  likes: number;
  liked: boolean;
  likes_count: number;
} 