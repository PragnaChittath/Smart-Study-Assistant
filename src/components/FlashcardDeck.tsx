import React, { useEffect } from 'react';
import { Flashcard } from '../types';
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Shuffle,
  Volume2,
  Download,
  Sparkles,
} from 'lucide-react';
import { useFlashcardEngine, exportDeckToAnkiCSV } from '../utils/flashcardEngine';

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  title?: string;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ flashcards: initialCards, title }) => {
  const { state, dispatch, activeCard, handleSpeechPlayback, shuffle } = useFlashcardEngine(initialCards);

  const {
    cards,
    activeCardIndex,
    faceFlipped,
    isAudioPlaying,
    shuffleAlertVisible,
    shufflingAnimation,
    notificationMessage,
  } = state;

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_FLIP' });
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        dispatch({ type: 'GO_NEXT' });
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        dispatch({ type: 'GO_PREV' });
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        shuffle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards.length, shuffle, dispatch]);

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm bg-slate-900 rounded-2xl border border-slate-800">
        No flashcards generated for this set.
      </div>
    );
  }

  let masteredCount = 0;
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].mastered) masteredCount++;
  }
  const progressPercent = Math.round((masteredCount / cards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top Deck Stats & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl px-6 py-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-500/25 shrink-0 shadow-sm">
            {activeCardIndex + 1}/{cards.length}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">
              Mastery: {masteredCount} of {cards.length} Mastered ({progressPercent}%)
            </div>
            <div className="w-40 sm:w-52 bg-slate-800 h-2.5 rounded-full overflow-hidden mt-1.5 shadow-inner">
              <div
                className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Shuffle Button */}
          <button
            id="flashcard-shuffle-btn"
            type="button"
            onClick={shuffle}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm ${
              shuffleAlertVisible
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700'
            }`}
            title="Randomize flashcards order during review (Shortcut: S)"
          >
            <Shuffle
              className={`w-3.5 h-3.5 text-indigo-400 transition-transform duration-300 ${
                shufflingAnimation ? 'rotate-180 scale-110' : ''
              }`}
            />
            <span>Shuffle Deck</span>
          </button>

          {/* Export Anki CSV */}
          <button
            type="button"
            onClick={() => exportDeckToAnkiCSV(cards, title)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Export for Anki or CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Anki CSV</span>
          </button>
        </div>
      </div>

      {/* Shuffle Notification Toast */}
      {shuffleAlertVisible && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Deck Shuffled!</strong> Cards randomized for active recall session.
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESTORE_ORIGINAL_ORDER', payload: initialCards })}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-200 underline cursor-pointer"
          >
            Reset Order
          </button>
        </div>
      )}

      {/* TTS Status Toast */}
      {notificationMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{notificationMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_NOTIFICATION', payload: null })}
            className="text-xs text-amber-400 hover:text-amber-200 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3D FLASHCARD CANVAS */}
      <div
        onClick={() => dispatch({ type: 'TOGGLE_FLIP' })}
        className="relative w-full h-80 sm:h-96 cursor-pointer group perspective-1000 select-none"
      >
        <div
          className={`w-full h-full duration-500 transition-all transform-style-3d ${
            faceFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT FACE */}
          <div className="absolute inset-0 w-full h-full rounded-3xl bg-slate-900 border-2 border-indigo-500/30 group-hover:border-indigo-500/60 shadow-2xl p-8 flex flex-col justify-between backface-hidden transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 font-bold text-indigo-300">
                {activeCard?.category || 'Question'}
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSpeechPlayback}
                  className={`p-2 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                    isAudioPlaying
                      ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Audio Pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {activeCard?.mastered && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 shadow-sm">
                    <Check className="w-3.5 h-3.5" /> Mastered
                  </span>
                )}
              </div>
            </div>

            <div className="text-center px-6 my-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
                Prompt / Concept
              </span>
              <p className="text-lg sm:text-2xl font-bold text-slate-100 leading-snug">
                {activeCard?.front}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-indigo-400 font-semibold">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Click card or press Space to reveal answer</span>
            </div>
          </div>

          {/* BACK FACE */}
          <div className="absolute inset-0 w-full h-full rounded-3xl bg-indigo-950/90 border-2 border-indigo-500/50 shadow-2xl p-8 flex flex-col justify-between backface-hidden rotate-y-180">
            <div className="flex items-center justify-between text-xs text-indigo-300">
              <span className="px-3 py-1 rounded-full bg-indigo-900/90 border border-indigo-500/40 font-bold">
                Answer / Explanation
              </span>

              <button
                type="button"
                onClick={handleSpeechPlayback}
                className={`p-2 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                  isAudioPlaying
                    ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400/40'
                    : 'bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border-indigo-500/40'
                }`}
                title="Audio Pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center px-6 my-auto">
              <p className="text-base sm:text-xl font-semibold text-slate-100 leading-relaxed">
                {activeCard?.back}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-indigo-300 font-semibold">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Click to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR WITH GENEROUS SPACING */}
      <div className="flex items-center justify-between gap-4 pt-2">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'GO_PREV' })}
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-md cursor-pointer"
          title="Previous Card (ArrowLeft)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Mastered / Need Review actions */}
        <div className="flex items-center gap-3 flex-1 justify-center max-w-md">
          <button
            type="button"
            onClick={() => dispatch({ type: 'RECORD_MASTERY', payload: { index: activeCardIndex, mastered: false } })}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs sm:text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Needs Review</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'RECORD_MASTERY', payload: { index: activeCardIndex, mastered: true } })}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Got It! (Mastered)</span>
          </button>
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'GO_NEXT' })}
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-md cursor-pointer"
          title="Next Card (ArrowRight)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
