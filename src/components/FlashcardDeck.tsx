import React, { useState, useEffect } from 'react';
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
  RefreshCw,
} from 'lucide-react';

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  title?: string;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ flashcards: initialCards, title }) => {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [shuffleNotification, setShuffleNotification] = useState(false);
  const [ttsNotification, setTtsNotification] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  // Update cards when props change
  useEffect(() => {
    setCards(initialCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [initialCards]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleShuffle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards.length]);

  const currentCard = cards[currentIndex] || cards[0];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleMarkMastered = (mastered: boolean) => {
    const updated = [...cards];
    updated[currentIndex] = { ...updated[currentIndex], mastered };
    setCards(updated);
    handleNext();
  };

  // Robust Fisher-Yates shuffle algorithm for true uniform randomization
  const handleShuffle = () => {
    setIsShuffling(true);
    setIsFlipped(false);

    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setCards(shuffled);
    setCurrentIndex(0);

    setShuffleNotification(true);
    setTimeout(() => {
      setIsShuffling(false);
    }, 400);
    setTimeout(() => {
      setShuffleNotification(false), 2400;
    }, 2400);
  };

  const handleResetOrder = () => {
    setIsFlipped(false);
    setCards(initialCards);
    setCurrentIndex(0);
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsNotification('Text-to-speech is not supported in this browser environment.');
      setTimeout(() => setTtsNotification(null), 4000);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const textToRead = isFlipped ? currentCard.back : currentCard.front;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.95;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => {
        setSpeaking(false);
        setTtsNotification('Speech synthesis encountered an error or was interrupted.');
        setTimeout(() => setTtsNotification(null), 4000);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
      setTtsNotification('Unable to initiate audio playback in this browser.');
      setTimeout(() => setTtsNotification(null), 4000);
    }
  };

  const handleExportCSV = () => {
    const rows = [['Front', 'Back', 'Category', 'Difficulty']];
    cards.forEach((c) => {
      rows.push([
        `"${c.front.replace(/"/g, '""')}"`,
        `"${c.back.replace(/"/g, '""')}"`,
        `"${c.category || ''}"`,
        `"${c.difficulty || ''}"`,
      ]);
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title || 'Flashcards'}_Anki_Deck.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const masteredCount = cards.filter((c) => c.mastered).length;
  const progressPercent = Math.round((masteredCount / cards.length) * 100);

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm bg-slate-900 rounded-2xl border border-slate-800">
        No flashcards generated for this set.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top Deck Stats & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl px-6 py-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-500/25 shrink-0 shadow-sm">
            {currentIndex + 1}/{cards.length}
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
            onClick={handleShuffle}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm ${
              shuffleNotification
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700'
            }`}
            title="Randomize flashcards order during review (Shortcut: S)"
          >
            <Shuffle className={`w-3.5 h-3.5 text-indigo-400 transition-transform duration-300 ${isShuffling ? 'rotate-180 scale-110' : ''}`} />
            <span>Shuffle Deck</span>
          </button>

          {/* Export Anki CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Export for Anki or CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Anki CSV</span>
          </button>
        </div>
      </div>

      {/* Shuffle Notification Toast */}
      {shuffleNotification && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Deck Shuffled!</strong> Cards randomized for active recall session.
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetOrder}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-200 underline cursor-pointer"
          >
            Reset Order
          </button>
        </div>
      )}

      {/* TTS Status Toast */}
      {ttsNotification && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{ttsNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setTtsNotification(null)}
            className="text-xs text-amber-400 hover:text-amber-200 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3D FLASHCARD CANVAS */}
      <div
        onClick={handleFlip}
        className="relative w-full h-80 sm:h-96 cursor-pointer group perspective-1000 select-none"
      >
        <div
          className={`w-full h-full duration-500 transition-all transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT FACE */}
          <div className="absolute inset-0 w-full h-full rounded-3xl bg-slate-900 border-2 border-indigo-500/30 group-hover:border-indigo-500/60 shadow-2xl p-8 flex flex-col justify-between backface-hidden transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 font-bold text-indigo-300">
                {currentCard.category || 'Question'}
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSpeak}
                  className={`p-2 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                    speaking
                      ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Audio Pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {currentCard.mastered && (
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
                {currentCard.front}
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
                onClick={handleSpeak}
                className={`p-2 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                  speaking
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
                {currentCard.back}
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
          onClick={handlePrev}
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-md cursor-pointer"
          title="Previous Card (ArrowLeft)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Mastered / Need Review actions */}
        <div className="flex items-center gap-3 flex-1 justify-center max-w-md">
          <button
            type="button"
            onClick={() => handleMarkMastered(false)}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs sm:text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Needs Review</span>
          </button>

          <button
            type="button"
            onClick={() => handleMarkMastered(true)}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Got It! (Mastered)</span>
          </button>
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-md cursor-pointer"
          title="Next Card (ArrowRight)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
