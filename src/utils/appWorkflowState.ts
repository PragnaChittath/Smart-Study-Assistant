import { StudySet } from '../types';

export type AppWorkflowView = 'home' | 'workspace';

export interface AppWorkflowState {
  currentStudySet: StudySet | null;
  activeView: AppWorkflowView;
  isProcessing: boolean;
  activeProcessingStep: string;
  processingProgress: number;
  errorMessage: string | null;
  savedSetsModalOpen: boolean;
  voiceRecorderModalOpen: boolean;
  vivaSimulatorOpen: boolean;
}

export type AppWorkflowAction =
  | { type: 'START_SYNTHESIS'; payload: { initialStep?: string } }
  | { type: 'UPDATE_PROGRESS'; payload: { step: string; progress: number } }
  | { type: 'SYNTHESIS_SUCCESS'; payload: { studySet: StudySet } }
  | { type: 'SYNTHESIS_ERROR'; payload: { error: string } }
  | { type: 'RESTORE_STUDY_SET'; payload: { studySet: StudySet } }
  | { type: 'UPDATE_CURRENT_SET'; payload: { studySet: StudySet } }
  | { type: 'NAVIGATE_VIEW'; payload: { view: AppWorkflowView } }
  | { type: 'TOGGLE_SAVED_SETS_MODAL'; payload: boolean }
  | { type: 'TOGGLE_VOICE_RECORDER_MODAL'; payload: boolean }
  | { type: 'TOGGLE_VIVA_SIMULATOR'; payload: boolean }
  | { type: 'CLEAR_STUDY_SET' }
  | { type: 'DISMISS_ERROR' };

export const initialAppWorkflowState: AppWorkflowState = {
  currentStudySet: null,
  activeView: 'home',
  isProcessing: false,
  activeProcessingStep: '',
  processingProgress: 0,
  errorMessage: null,
  savedSetsModalOpen: false,
  voiceRecorderModalOpen: false,
  vivaSimulatorOpen: false,
};

export function appWorkflowReducer(
  state: AppWorkflowState,
  action: AppWorkflowAction
): AppWorkflowState {
  switch (action.type) {
    case 'START_SYNTHESIS':
      return {
        ...state,
        isProcessing: true,
        activeProcessingStep: action.payload.initialStep || 'Analyzing course materials...',
        processingProgress: 15,
        errorMessage: null,
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        activeProcessingStep: action.payload.step,
        processingProgress: action.payload.progress,
      };

    case 'SYNTHESIS_SUCCESS':
      return {
        ...state,
        isProcessing: false,
        processingProgress: 100,
        currentStudySet: action.payload.studySet,
        activeView: 'workspace',
        errorMessage: null,
      };

    case 'SYNTHESIS_ERROR':
      return {
        ...state,
        isProcessing: false,
        processingProgress: 0,
        errorMessage: action.payload.error,
      };

    case 'RESTORE_STUDY_SET':
      return {
        ...state,
        currentStudySet: action.payload.studySet,
        activeView: 'workspace',
        savedSetsModalOpen: false,
      };

    case 'UPDATE_CURRENT_SET':
      return {
        ...state,
        currentStudySet: action.payload.studySet,
      };

    case 'NAVIGATE_VIEW':
      return {
        ...state,
        activeView: action.payload.view,
      };

    case 'TOGGLE_SAVED_SETS_MODAL':
      return {
        ...state,
        savedSetsModalOpen: action.payload,
      };

    case 'TOGGLE_VOICE_RECORDER_MODAL':
      return {
        ...state,
        voiceRecorderModalOpen: action.payload,
      };

    case 'TOGGLE_VIVA_SIMULATOR':
      return {
        ...state,
        vivaSimulatorOpen: action.payload,
      };

    case 'CLEAR_STUDY_SET':
      return {
        ...state,
        currentStudySet: null,
        activeView: 'home',
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
