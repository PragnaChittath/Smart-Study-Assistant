import { QuizQuestion } from '../types';

export interface QuizAttemptState {
  answeredIndexMap: Record<number, number>;
  activeQuestionIndex: number;
  revealedHints: Record<number, boolean>;
  revealedExplanations: Record<number, boolean>;
  quizCompleted: boolean;
}

export interface QuizMetrics {
  totalCount: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracyRate: number;
  letterGrade: string;
  verdictMessage: string;
}

export function computeQuizMetrics(questions: QuizQuestion[], userAnswers: Record<number, number>): QuizMetrics {
  const total = questions.length;
  if (total === 0) {
    return {
      totalCount: 0,
      answeredCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      accuracyRate: 0,
      letterGrade: 'N/A',
      verdictMessage: 'No questions in this evaluation round.',
    };
  }

  let tallyCorrect = 0;
  let tallyAnswered = 0;

  for (let idx = 0; idx < total; idx++) {
    const selected = userAnswers[idx];
    if (typeof selected === 'number') {
      tallyAnswered++;
      if (selected === questions[idx].correctAnswerIndex) {
        tallyCorrect++;
      }
    }
  }

  const accuracy = Math.round((tallyCorrect / total) * 100);

  let grade = 'F';
  let message = 'Review the material and re-test concepts.';

  if (accuracy >= 90) {
    grade = 'A+';
    message = 'Mastery Achieved! Exceptional conceptual retention.';
  } else if (accuracy >= 80) {
    grade = 'A';
    message = 'Strong performance! Key learning objectives secured.';
  } else if (accuracy >= 70) {
    grade = 'B';
    message = 'Solid understanding with minor review opportunities.';
  } else if (accuracy >= 60) {
    grade = 'C';
    message = 'Passing threshold met. Focus on weak topic areas.';
  }

  return {
    totalCount: total,
    answeredCount: tallyAnswered,
    correctCount: tallyCorrect,
    incorrectCount: tallyAnswered - tallyCorrect,
    accuracyRate: accuracy,
    letterGrade: grade,
    verdictMessage: message,
  };
}

export function isAnswerCorrect(question: QuizQuestion, selectedOptionIndex?: number): boolean {
  if (typeof selectedOptionIndex !== 'number') return false;
  return selectedOptionIndex === question.correctAnswerIndex;
}

export const OPTION_INDEX_SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function getOptionLetter(index: number): string {
  return OPTION_INDEX_SYMBOLS[index] ?? String.fromCharCode(65 + index);
}
