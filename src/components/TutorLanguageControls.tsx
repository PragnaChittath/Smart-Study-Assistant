import React, { useState, useRef, useEffect } from 'react';
import { StudyLanguage, STUDY_LANGUAGES, findLanguageByCode } from '../data/languages';
import {
  Globe,
  Keyboard,
  Bot,
  Search,
  Check,
  ChevronDown,
  ArrowRightLeft,
  X,
  Sparkles,
} from 'lucide-react';

interface TutorLanguageControlsProps {
  inputLanguage: StudyLanguage;
  outputLanguage: StudyLanguage;
  onSelectInputLanguage: (lang: StudyLanguage) => void;
  onSelectOutputLanguage: (lang: StudyLanguage) => void;
  isKeyboardOpen: boolean;
  onToggleKeyboard: () => void;
}

export const TutorLanguageControls: React.FC<TutorLanguageControlsProps> = ({
  inputLanguage,
  outputLanguage,
  onSelectInputLanguage,
  onSelectOutputLanguage,
  isKeyboardOpen,
  onToggleKeyboard,
}) => {
  const [activeModal, setActiveModal] = useState<'input' | 'output' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Indian' | 'Global' | 'Mixed'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeModal) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setCategoryFilter('ALL');
    }
  }, [activeModal]);

  const filteredLanguages = STUDY_LANGUAGES.filter((lang) => {
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'Indian' && lang.category !== 'Indian' && lang.category !== 'English') {
        return false;
      }
      if (categoryFilter === 'Global' && lang.category !== 'Global' && lang.category !== 'English') {
        return false;
      }
      if (categoryFilter === 'Mixed' && lang.category !== 'Mixed') {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q) ||
      (lang.description && lang.description.toLowerCase().includes(q))
    );
  });

  const handleSwapLanguages = () => {
    const prevInput = inputLanguage;
    const prevOutput = outputLanguage;
    onSelectInputLanguage(prevOutput);
    onSelectOutputLanguage(prevInput);
  };

  return (
    <>
      {/* Top Banner showing Input and Output Languages */}
      <div className="bg-slate-950/80 border-b border-slate-800/90 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Input Language Selector Button */}
          <button
            type="button"
            onClick={() => setActiveModal('input')}
            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-indigo-500 text-slate-200 transition cursor-pointer active:scale-95 shadow-sm"
            title="Change Input Language / Script"
          >
            <span className="text-sm">⌨️</span>
            <span className="text-slate-400 font-medium text-[11px]">Input:</span>
            <span className="font-bold text-indigo-300 group-hover:text-indigo-200 truncate max-w-[130px] sm:max-w-[170px]">
              {inputLanguage.nativeName.split('(')[0].trim()}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
          </button>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwapLanguages}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-300 transition cursor-pointer active:scale-90"
            title="Swap Input & Output Languages"
          >
            <ArrowRightLeft className="w-3 h-3" />
          </button>

          {/* Output Language Selector Button */}
          <button
            type="button"
            onClick={() => setActiveModal('output')}
            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-emerald-500 text-slate-200 transition cursor-pointer active:scale-95 shadow-sm"
            title="Change AI Tutor Output Language"
          >
            <span className="text-sm">🤖</span>
            <span className="text-slate-400 font-medium text-[11px]">Output:</span>
            <span className="font-bold text-emerald-300 group-hover:text-emerald-200 truncate max-w-[130px] sm:max-w-[170px]">
              {outputLanguage.nativeName.split('(')[0].trim()}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
          </button>
        </div>

        {/* Right side: Virtual Keyboard toggle */}
        <button
          type="button"
          onClick={onToggleKeyboard}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer active:scale-95 shadow-sm ${
            isKeyboardOpen
              ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/30'
              : 'bg-indigo-950/40 hover:bg-indigo-900/60 border-indigo-500/30 text-indigo-300'
          }`}
          title="Toggle on-screen script keyboard / character palette"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isKeyboardOpen ? 'Hide Script Keys' : 'Script Keys'}
          </span>
        </button>
      </div>

      {/* Searchable Multilingual Language Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                    activeModal === 'input'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {activeModal === 'input' ? <Keyboard className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {activeModal === 'input' ? 'Select Input Language & Script' : 'Select AI Output Language'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeModal === 'input'
                      ? 'Choose language/script you want to type or speak in'
                      : 'Choose language in which AI Tutor will formulate answers'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input & Filters */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Indian languages, World languages, or native scripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                {(['ALL', 'Indian', 'Global', 'Mixed'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-xl font-medium transition shrink-0 cursor-pointer text-[11px] ${
                      categoryFilter === cat
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                    }`}
                  >
                    {cat === 'ALL'
                      ? 'All Languages'
                      : cat === 'Indian'
                      ? '🇮🇳 Indian (22+ Official)'
                      : cat === 'Global'
                      ? '🌐 World Languages'
                      : '🔀 Mixed Modes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Language list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[380px]">
              {filteredLanguages.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No languages matching "{searchQuery}".
                </div>
              ) : (
                filteredLanguages.map((lang) => {
                  const isSelected =
                    activeModal === 'input'
                      ? inputLanguage.code === lang.code
                      : outputLanguage.code === lang.code;

                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        if (activeModal === 'input') {
                          onSelectInputLanguage(lang);
                        } else {
                          onSelectOutputLanguage(lang);
                        }
                        setActiveModal(null);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition cursor-pointer ${
                        isSelected
                          ? activeModal === 'input'
                            ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-100'
                            : 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-100'
                          : 'hover:bg-slate-800/70 text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base shrink-0">{lang.flag || '🌐'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-100 truncate">
                              {lang.nativeName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                              {lang.code}
                            </span>
                          </div>
                          {lang.description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[280px] sm:max-w-[340px]">
                              {lang.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            activeModal === 'input'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
