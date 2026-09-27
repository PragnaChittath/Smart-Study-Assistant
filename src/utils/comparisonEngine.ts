import { useReducer, useCallback } from 'react';
import { StudySet, ComparisonData } from '../types';

export interface ComparisonViewState {
  copiedSection: string | null;
  displayMode: 'all' | 'table' | 'contradictions' | 'dimensions';
  isProcessing: boolean;
  lensPrompt: string;
  focusModalOpen: boolean;
  activeConflictIndex: number | null;
  statusError: string | null;
}

export type ComparisonViewAction =
  | { type: 'SET_COPIED'; payload: string | null }
  | { type: 'SET_DISPLAY_MODE'; payload: 'all' | 'table' | 'contradictions' | 'dimensions' }
  | { type: 'START_REGENERATION' }
  | { type: 'REGENERATION_SUCCESS' }
  | { type: 'REGENERATION_FAILURE'; payload: string }
  | { type: 'SET_LENS_PROMPT'; payload: string }
  | { type: 'TOGGLE_FOCUS_MODAL'; payload: boolean }
  | { type: 'SELECT_CONFLICT'; payload: number | null }
  | { type: 'CLEAR_ERROR' };

export function comparisonViewReducer(
  state: ComparisonViewState,
  action: ComparisonViewAction
): ComparisonViewState {
  switch (action.type) {
    case 'SET_COPIED':
      return { ...state, copiedSection: action.payload };
    case 'SET_DISPLAY_MODE':
      return { ...state, displayMode: action.payload };
    case 'START_REGENERATION':
      return { ...state, isProcessing: true, statusError: null };
    case 'REGENERATION_SUCCESS':
      return { ...state, isProcessing: false, focusModalOpen: false, statusError: null };
    case 'REGENERATION_FAILURE':
      return { ...state, isProcessing: false, statusError: action.payload };
    case 'SET_LENS_PROMPT':
      return { ...state, lensPrompt: action.payload };
    case 'TOGGLE_FOCUS_MODAL':
      return { ...state, focusModalOpen: action.payload };
    case 'SELECT_CONFLICT':
      return { ...state, activeConflictIndex: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, statusError: null };
    default:
      return state;
  }
}

export function useComparisonWorkflow(
  studySet: StudySet,
  onUpdateStudySet?: (updated: StudySet) => void
) {
  const [state, dispatch] = useReducer(comparisonViewReducer, {
    copiedSection: null,
    displayMode: 'all',
    isProcessing: false,
    lensPrompt: '',
    focusModalOpen: false,
    activeConflictIndex: null,
    statusError: null,
  });

  const copyToClipboard = useCallback((textToCopy: string, tag: string) => {
    navigator.clipboard.writeText(textToCopy);
    dispatch({ type: 'SET_COPIED', payload: tag });
    setTimeout(() => dispatch({ type: 'SET_COPIED', payload: null }), 2500);
  }, []);

  const triggerComparisonSynthesis = useCallback(
    async (customTargetFocus?: string) => {
      dispatch({ type: 'START_REGENERATION' });
      try {
        const res = await fetch('/api/compare-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyContext: {
              title: studySet.title,
              sourceFiles: studySet.sourceFiles || [studySet.sourceName],
              summary: studySet.summary,
              rawTextSnippet: studySet.rawTextSnippet,
            },
            focus: customTargetFocus || state.lensPrompt || undefined,
          }),
        });

        const data = await res.json();
        if (data.success && data.comparison) {
          const updated: StudySet = {
            ...studySet,
            comparison: data.comparison,
          };
          if (onUpdateStudySet) onUpdateStudySet(updated);
          dispatch({ type: 'REGENERATION_SUCCESS' });
        } else {
          dispatch({
            type: 'REGENERATION_FAILURE',
            payload: data.error || 'Failed to generate comparative analysis.',
          });
          setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 6000);
        }
      } catch (err: any) {
        console.error('Error generating comparison:', err);
        dispatch({
          type: 'REGENERATION_FAILURE',
          payload: 'Failed to connect to comparison service. Please check network connection.',
        });
        setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 6000);
      }
    },
    [studySet, state.lensPrompt, onUpdateStudySet]
  );

  return {
    state,
    dispatch,
    copyToClipboard,
    triggerComparisonSynthesis,
  };
}
