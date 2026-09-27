import React, { useReducer } from 'react';
import { QuizQuestion, StudySet } from '../types';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Award,
  ArrowRight,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { computeQuizMetrics, getOptionLetter } from '../utils/quizEngine';

interface QuizViewProps {
  quiz: QuizQuestion[];
  studySet?: StudySet;
  onUpdateQuiz?: (newQuiz: QuizQuestion[]) => void;
}

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  selectedOption: number | null;
  showExplanation: boolean;
  showHint: boolean;
  userAnswers: Record<number, number>;
  isCompleted: boolean;
  isGeneratingMore: boolean;
  errorMessage: string | null;
}

type QuizAction =
  | { type: 'SELECT_OPTION'; payload: { optionIdx: number } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'RETAKE_QUIZ' }
  | { type: 'TOGGLE_HINT' }
  | { type: 'START_GENERATE_MORE' }
  | { type: 'GENERATE_MORE_SUCCESS'; payload: { newQuestions: QuizQuestion[] } }
  | { type: 'GENERATE_MORE_ERROR'; payload: { error: string } }
  | { type: 'DISMISS_ERROR' };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SELECT_OPTION': {
      if (state.selectedOption !== null) return state;
      return {
        ...state,
        selectedOption: action.payload.optionIdx,
        showExplanation: true,
        userAnswers: { ...state.userAnswers, [state.currentIndex]: action.payload.optionIdx },
      };
    }

    case 'NEXT_QUESTION': {
      if (state.currentIndex < state.questions.length - 1) {
        const nextIdx = state.currentIndex + 1;
        const nextAnswer = state.userAnswers[nextIdx];
        return {
          ...state,
          currentIndex: nextIdx,
          selectedOption: nextAnswer !== undefined ? nextAnswer : null,
          showExplanation: nextAnswer !== undefined,
          showHint: false,
        };
      }
      return {
        ...state,
        isCompleted: true,
      };
    }

    case 'RETAKE_QUIZ':
      return {
        ...state,
        currentIndex: 0,
        selectedOption: null,
        showExplanation: false,
        showHint: false,
        userAnswers: {},
        isCompleted: false,
        errorMessage: null,
      };

    case 'TOGGLE_HINT':
      return {
        ...state,
        showHint: !state.showHint,
      };

    case 'START_GENERATE_MORE':
      return {
        ...state,
        isGeneratingMore: true,
        errorMessage: null,
      };

    case 'GENERATE_MORE_SUCCESS': {
      const combined = [...state.questions, ...action.payload.newQuestions];
      return {
        ...state,
        questions: combined,
        currentIndex: state.questions.length,
        selectedOption: null,
        showExplanation: false,
        showHint: false,
        isCompleted: false,
        isGeneratingMore: false,
      };
    }

    case 'GENERATE_MORE_ERROR':
      return {
        ...state,
        isGeneratingMore: false,
        errorMessage: action.payload.error,
      };

    case 'DISMISS_ERROR':
      return {
        ...state,
        errorMessage: null,
      };

    default:
      return state;
  }
}

export const QuizView: React.FC<QuizViewProps> = ({ quiz: initialQuiz, studySet, onUpdateQuiz }) => {
  const [state, dispatch] = useReducer(quizReducer, {
    questions: initialQuiz,
    currentIndex: 0,
    selectedOption: null,
    showExplanation: false,
    showHint: false,
    userAnswers: {},
    isCompleted: false,
    isGeneratingMore: false,
    errorMessage: null,
  });

  const {
    questions,
    currentIndex,
    selectedOption,
    showExplanation,
    showHint,
    userAnswers,
    isCompleted,
    isGeneratingMore,
    errorMessage,
  } = state;

  const currentQ = questions[currentIndex];

  const handleGenerateMore = async () => {
    if (!studySet) return;
    dispatch({ type: 'START_GENERATE_MORE' });

    try {
      const res = await fetch('/api/generate-extra-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyContext: studySet,
          count: 5,
          studyLanguage: studySet.studyLanguage,
        }),
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        dispatch({ type: 'GENERATE_MORE_SUCCESS', payload: { newQuestions: data.questions } });
        if (onUpdateQuiz) onUpdateQuiz([...questions, ...data.questions]);
      } else {
        dispatch({
          type: 'GENERATE_MORE_ERROR',
          payload: { error: data.error || 'Could not generate additional questions.' },
        });
        setTimeout(() => dispatch({ type: 'DISMISS_ERROR' }), 5000);
      }
    } catch (e) {
      console.error('Failed to generate extra questions', e);
      dispatch({
        type: 'GENERATE_MORE_ERROR',
        payload: { error: 'Could not generate additional questions at this moment.' },
      });
      setTimeout(() => dispatch({ type: 'DISMISS_ERROR' }), 5000);
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm bg-slate-900 rounded-2xl border border-slate-800">
        No quiz questions generated.
      </div>
    );
  }

  const metrics = computeQuizMetrics(questions, userAnswers);

  // SUMMARY SCREEN ON COMPLETION
  if (isCompleted) {
    return (
      <div className="max-w-xl mx-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-xl">
        <div className="w-18 h-18 mx-auto rounded-3xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shadow-md">
          <Award className="w-9 h-9" />
        </div>

        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Quiz Completed!</h3>
          <p className="text-sm text-slate-400 mt-1.5">
            You completed {questions.length} multiple-choice questions.
          </p>
        </div>

        {/* Score Badge */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/70 border border-slate-800 inline-block w-full shadow-inner">
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 mb-2">
            {metrics.accuracyRate}%
          </div>
          <p className="text-sm text-slate-200 font-bold">
            {metrics.correctCount} out of {metrics.totalCount} Correct ({metrics.letterGrade})
          </p>
          <p className="text-xs text-slate-400 mt-2.5 max-w-md mx-auto leading-relaxed">
            {metrics.verdictMessage}
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => dispatch({ type: 'DISMISS_ERROR' })}
              className="text-rose-400 hover:text-rose-200 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Buttons with generous spacing */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => dispatch({ type: 'RETAKE_QUIZ' })}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retake Quiz</span>
          </button>

          <button
            onClick={handleGenerateMore}
            disabled={isGeneratingMore}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-bold shadow-xl shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Generate 5 More Questions</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Quiz Progress Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-3xl px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <span className="text-xs font-bold text-indigo-300 bg-indigo-500/15 px-3 py-1.5 rounded-xl border border-indigo-500/25 shadow-sm">
            Q{currentIndex + 1} of {questions.length}
          </span>
          <div className="w-36 sm:w-52 bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {currentQ.hint && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_HINT' })}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
          </button>
        )}
      </div>

      {/* Hint Alert */}
      {showHint && currentQ.hint && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5 shadow-sm animate-in fade-in">
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Hint:</span> {currentQ.hint}
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <h3 className="text-base sm:text-xl font-extrabold text-slate-100 leading-snug">
          {currentQ.question}
        </h3>

        {/* Options with clean spacing */}
        <div className="space-y-3">
          {currentQ.options.map((optionText, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctAnswerIndex;
            let btnStyle =
              'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-950/80';

            if (selectedOption !== null) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/40';
              } else if (isSelected) {
                btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-md shadow-rose-950/40';
              } else {
                btnStyle = 'bg-slate-950/30 border-slate-900 text-slate-500 opacity-50';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => dispatch({ type: 'SELECT_OPTION', payload: { optionIdx: idx } })}
                disabled={selectedOption !== null}
                className={`w-full p-4 sm:p-4.5 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all duration-200 flex items-start justify-between gap-3.5 cursor-pointer ${btnStyle} ${
                  selectedOption === null ? 'hover:-translate-y-0.5 active:translate-y-0' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center font-bold text-xs text-slate-300">
                    {getOptionLetter(idx)}
                  </span>
                  <span className="mt-0.5 leading-relaxed">{optionText}</span>
                </div>

                {selectedOption !== null && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {selectedOption !== null && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Block */}
        {showExplanation && (
          <div
            className={`p-4.5 rounded-2xl border text-xs sm:text-sm space-y-2 animate-in fade-in ${
              selectedOption === currentQ.correctAnswerIndex
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {selectedOption === currentQ.correctAnswerIndex ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Correct Answer!
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" /> Incorrect Choice
                </>
              )}
            </div>
            <p className="text-slate-300 leading-relaxed">{currentQ.explanation}</p>
          </div>
        )}
      </div>

      {/* Next / Submit Button with generous spacing */}
      {selectedOption !== null && (
        <div className="flex justify-end pt-1">
          <button
            onClick={() => dispatch({ type: 'NEXT_QUESTION' })}
            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 cursor-pointer"
          >
            <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
