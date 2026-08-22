import React, { useState, useRef, useEffect } from 'react';
import { STUDY_LANGUAGES, StudyLanguage, findLanguageByCode } from '../data/languages';
import {
  Globe,
  Search,
  Check,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface StudyLanguageSelectorProps {
  currentLanguageCode?: string;
  onSelectLanguage: (lang: StudyLanguage) => void;
  onTranslateSet?: (lang: StudyLanguage) => Promise<void> | void;
  isTranslating?: boolean;
  showTranslateOption?: boolean;
  className?: string;
}

export const StudyLanguageSelector: React.FC<StudyLanguageSelectorProps> = ({
  currentLanguageCode = 'te-IN',
  onSelectLanguage,
  onTranslateSet,
  isTranslating = false,
  showTranslateOption = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Indian' | 'Mixed' | 'Global'>('All');
  const [pendingTranslateLang, setPendingTranslateLang] = useState<StudyLanguage | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentLang = findLanguageByCode(currentLanguageCode);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setPendingTranslateLang(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setPendingTranslateLang(null);
    }
  }, [isOpen]);

  const filteredLanguages = STUDY_LANGUAGES.filter((lang) => {
    if (categoryFilter === 'Indian' && lang.category !== 'Indian') return false;
    if (categoryFilter === 'Mixed' && lang.category !== 'Mixed') return false;
    if (categoryFilter === 'Global' && lang.category !== 'Global' && lang.category !== 'English') return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      lang.name.toLowerCase().includes(query) ||
      lang.nativeName.toLowerCase().includes(query) ||
      lang.code.toLowerCase().includes(query) ||
      (lang.description && lang.description.toLowerCase().includes(query))
    );
  });

  const handleLanguageClick = (lang: StudyLanguage) => {
    if (showTranslateOption && onTranslateSet && lang.code !== currentLang.code) {
      setPendingTranslateLang(lang);
    } else {
      onSelectLanguage(lang);
      setIsOpen(false);
      setPendingTranslateLang(null);
    }
  };

  const handleConfirmTranslate = async () => {
    if (pendingTranslateLang && onTranslateSet) {
      await onTranslateSet(pendingTranslateLang);
      setIsOpen(false);
      setPendingTranslateLang(null);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Language Header Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTranslating}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-95 ${
          isOpen
            ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500 ring-1 ring-indigo-500/30'
            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
        }`}
        title={`Change Language (Current: ${currentLang.nativeName})`}
      >
        <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Language</span>
      </button>

      {/* Small, Compact Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[380px]">
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200 tracking-tight">
                  Select Study Language
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setPendingTranslateLang(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages or script..."
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
              {(['All', 'Indian', 'Global', 'Mixed'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat === 'All'
                    ? 'All'
                    : cat === 'Indian'
                    ? '🇮🇳 Indian (22)'
                    : cat === 'Global'
                    ? '🌐 Global'
                    : '🔀 Mixed'}
                </button>
              ))}
            </div>
          </div>

          {/* If translating active study set */}
          {pendingTranslateLang ? (
            <div className="p-3.5 bg-indigo-950/40 border-b border-indigo-500/30 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Translate Active Study Set?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Translate summaries, flashcards, and quizzes into <strong>{pendingTranslateLang.nativeName}</strong>?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmTranslate}
                  disabled={isTranslating}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isTranslating ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Translating...</span>
                    </>
                  ) : (
                    <span>Translate Set</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectLanguage(pendingTranslateLang);
                    setIsOpen(false);
                    setPendingTranslateLang(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Set Only
                </button>
              </div>
            </div>
          ) : (
            /* Compact Scrollable Language List */
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[220px]">
              {filteredLanguages.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-semibold">No language found</p>
                  <p className="text-[10px] text-slate-500">Try searching English name or native script</p>
                </div>
              ) : (
                filteredLanguages.map((lang) => {
                  const isSelected = currentLang.code === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageClick(lang)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer group ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                          : 'hover:bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">{lang.flag || '🌐'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                              {lang.nativeName}
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-950 text-slate-400 font-mono">
                              {lang.code}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {lang.name}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Compact Footer */}
          <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>22 Indian + World + Mixed</span>
            <span className="font-semibold text-indigo-400">
              Active: {currentLang.nativeName.split('(')[0].trim()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
