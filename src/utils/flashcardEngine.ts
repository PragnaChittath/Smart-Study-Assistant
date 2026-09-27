import { useReducer, useEffect, useCallback } from 'react';
import { Flashcard } from '../types';
import { SpeechSynthesisCoordinator } from './audioEngine';

export interface FlashcardDeckState {
  cards: Flashcard[];
  activeCardIndex: number;
  faceFlipped: boolean;
  isAudioPlaying: boolean;
  shuffleAlertVisible: boolean;
  shufflingAnimation: boolean;
  notificationMessage: string | null;
}

export type FlashcardDeckAction =
  | { type: 'SYNC_CARDS'; payload: Flashcard[] }
  | { type: 'TOGGLE_FLIP' }
  | { type: 'SET_FLIPPED'; payload: boolean }
  | { type: 'GO_NEXT' }
  | { type: 'GO_PREV' }
  | { type: 'RECORD_MASTERY'; payload: { index: number; mastered: boolean } }
  | { type: 'SHUFFLE_DECK' }
  | { type: 'FINISH_SHUFFLE_ANIMATION' }
  | { type: 'HIDE_SHUFFLE_ALERT' }
  | { type: 'SET_AUDIO_PLAYING'; payload: boolean }
  | { type: 'SET_NOTIFICATION'; payload: string | null }
  | { type: 'RESTORE_ORIGINAL_ORDER'; payload: Flashcard[] };

export function flashcardDeckReducer(
  state: FlashcardDeckState,
  action: FlashcardDeckAction
): FlashcardDeckState {
  switch (action.type) {
    case 'SYNC_CARDS':
      return {
        ...state,
        cards: action.payload,
        activeCardIndex: 0,
        faceFlipped: false,
      };

    case 'TOGGLE_FLIP':
      return {
        ...state,
        faceFlipped: !state.faceFlipped,
      };

    case 'SET_FLIPPED':
      return {
        ...state,
        faceFlipped: action.payload,
      };

    case 'GO_NEXT':
      return {
        ...state,
        faceFlipped: false,
        activeCardIndex: state.cards.length > 0 ? (state.activeCardIndex + 1) % state.cards.length : 0,
      };

    case 'GO_PREV':
      return {
        ...state,
        faceFlipped: false,
        activeCardIndex:
          state.cards.length > 0
            ? (state.activeCardIndex - 1 + state.cards.length) % state.cards.length
            : 0,
      };

    case 'RECORD_MASTERY': {
      const cloned = [...state.cards];
      if (cloned[action.payload.index]) {
        cloned[action.payload.index] = {
          ...cloned[action.payload.index],
          mastered: action.payload.mastered,
        };
      }
      return {
        ...state,
        cards: cloned,
        faceFlipped: false,
        activeCardIndex: (state.activeCardIndex + 1) % cloned.length,
      };
    }

    case 'SHUFFLE_DECK': {
      const randomized = [...state.cards];
      for (let i = randomized.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [randomized[i], randomized[j]] = [randomized[j], randomized[i]];
      }
      return {
        ...state,
        cards: randomized,
        activeCardIndex: 0,
        faceFlipped: false,
        shufflingAnimation: true,
        shuffleAlertVisible: true,
      };
    }

    case 'FINISH_SHUFFLE_ANIMATION':
      return {
        ...state,
        shufflingAnimation: false,
      };

    case 'HIDE_SHUFFLE_ALERT':
      return {
        ...state,
        shuffleAlertVisible: false,
      };

    case 'SET_AUDIO_PLAYING':
      return {
        ...state,
        isAudioPlaying: action.payload,
      };

    case 'SET_NOTIFICATION':
      return {
        ...state,
        notificationMessage: action.payload,
      };

    case 'RESTORE_ORIGINAL_ORDER':
      return {
        ...state,
        cards: action.payload,
        activeCardIndex: 0,
        faceFlipped: false,
        shuffleAlertVisible: false,
      };

    default:
      return state;
  }
}

export function exportDeckToAnkiCSV(cards: Flashcard[], deckTitle?: string): void {
  const header = ['Front', 'Back', 'Category', 'Difficulty'];
  const formattedRows = [header];

  for (const card of cards) {
    formattedRows.push([
      `"${card.front.replace(/"/g, '""')}"`,
      `"${card.back.replace(/"/g, '""')}"`,
      `"${card.category || ''}"`,
      `"${card.difficulty || ''}"`,
    ]);
  }

  const csvBody = 'data:text/csv;charset=utf-8,' + formattedRows.map((cols) => cols.join(',')).join('\n');
  const encodedUri = encodeURI(csvBody);
  const anchor = document.createElement('a');
  anchor.setAttribute('href', encodedUri);
  anchor.setAttribute('download', `${deckTitle || 'Flashcards'}_Anki_Deck.csv`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function useFlashcardEngine(initialCards: Flashcard[]) {
  const [state, dispatch] = useReducer(flashcardDeckReducer, {
    cards: initialCards,
    activeCardIndex: 0,
    faceFlipped: false,
    isAudioPlaying: false,
    shuffleAlertVisible: false,
    shufflingAnimation: false,
    notificationMessage: null,
  });

  useEffect(() => {
    dispatch({ type: 'SYNC_CARDS', payload: initialCards });
  }, [initialCards]);

  const activeCard = state.cards[state.activeCardIndex] || state.cards[0];

  const handleSpeechPlayback = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!activeCard) return;

      const targetText = state.faceFlipped ? activeCard.back : activeCard.front;
      const success = SpeechSynthesisCoordinator.speakText(targetText, {
        onStart: () => dispatch({ type: 'SET_AUDIO_PLAYING', payload: true }),
        onEnd: () => dispatch({ type: 'SET_AUDIO_PLAYING', payload: false }),
        onError: () => {
          dispatch({ type: 'SET_AUDIO_PLAYING', payload: false });
          dispatch({
            type: 'SET_NOTIFICATION',
            payload: 'Audio playback encountered an error or was interrupted.',
          });
          setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), 4000);
        },
      });

      if (!success) {
        dispatch({
          type: 'SET_NOTIFICATION',
          payload: 'Text-to-speech is not supported in this browser environment.',
        });
        setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), 4000);
      }
    },
    [activeCard, state.faceFlipped]
  );

  const shuffle = useCallback(() => {
    dispatch({ type: 'SHUFFLE_DECK' });
    setTimeout(() => dispatch({ type: 'FINISH_SHUFFLE_ANIMATION' }), 400);
    setTimeout(() => dispatch({ type: 'HIDE_SHUFFLE_ALERT' }), 2400);
  }, []);

  return {
    state,
    dispatch,
    activeCard,
    handleSpeechPlayback,
    shuffle,
  };
}
