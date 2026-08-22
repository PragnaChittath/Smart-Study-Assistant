import React, { useState, useRef, useEffect } from 'react';
import { STUDY_LANGUAGES, StudyLanguage } from '../data/languages';
import { Search, ChevronDown, Check, Globe, Sparkles, X, Languages } from 'lucide-react';

interface SearchableLanguageSelectProps {
  id?: string;
  label?: string;
  hostName?: string;
  hostRole?: string;
  selectedCode: string;
  onChange: (lang: StudyLanguage) => void;
  accentColor?: 'indigo' | 'violet' | 'emerald' | 'amber';
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
}

export const SearchableLanguageSelect: React.FC<SearchableLanguageSelectProps> = ({
  id,
  label,
  hostName,
  hostRole,
  selectedCode,
  onChange,
  accentColor = 'indigo',
  disabled = false,
  compact = false,
  placeholder = 'Select language...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Indian' | 'Mixed' | 'Global'>('All');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedLanguage =
    STUDY_LANGUAGES.find((l) => l.code.toLowerCase() === selectedCode?.toLowerCase()) ||
    STUDY_LANGUAGES.find((l) => l.prefix.toLowerCase() === selectedCode?.split('-')[0]?.toLowerCase()) ||
    STUDY_LANGUAGES[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
    }
  }, [isOpen]);

  const filteredLanguages = STUDY_LANGUAGES.filter((lang) => {
    // Category match
    if (categoryFilter === 'Indian' && lang.category !== 'Indian') return false;
    if (categoryFilter === 'Mixed' && lang.category !== 'Mixed') return false;
    if (categoryFilter === 'Global' && lang.category !== 'Global' && lang.category !== 'English') return false;

    // Search query match
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      lang.name.toLowerCase().includes(query) ||
      lang.nativeName.toLowerCase().includes(query) ||
      lang.code.toLowerCase().includes(query) ||
      lang.prefix.toLowerCase().includes(query) ||
      (lang.description && lang.description.toLowerCase().includes(query))
    );
  });

  const indianCount = STUDY_LANGUAGES.filter((l) => l.category === 'Indian').length;
  const mixedCount = STUDY_LANGUAGES.filter((l) => l.category === 'Mixed').length;
  const globalCount = STUDY_LANGUAGES.filter((l) => l.category === 'Global' || l.category === 'English').length;

  const isIndigo = accentColor === 'indigo';
  const isViolet = accentColor === 'violet';
  const isEmerald = accentColor === 'emerald';

  const borderFocus = isViolet
    ? 'focus:border-violet-500 ring-violet-500/20'
    : isEmerald
    ? 'focus:border-emerald-500 ring-emerald-500/20'
    : 'focus:border-indigo-500 ring-indigo-500/20';

  const badgeBg = isViolet
    ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
    : isEmerald
    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
    : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30';

  const activeBtnStyle = isViolet
    ? 'bg-violet-600 text-white shadow-violet-600/30'
    : isEmerald
    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
    : 'bg-indigo-600 text-white shadow-indigo-600/30';

  return (
    <div className="relative" ref={containerRef} id={id}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span>{label}</span>
            {hostName && <span className="text-[10px] text-slate-400 font-normal">({hostName})</span>}
          </label>
          {hostRole && (
            <span className="text-[10px] text-slate-400 italic">
              {hostRole}
            </span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-left transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          compact ? 'p-2.5' : 'p-3'
        } ${isOpen ? `ring-2 ${borderFocus}` : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base shrink-0">{selectedLanguage.flag || '🌐'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-bold text-slate-100 truncate ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                {selectedLanguage.nativeName}
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-mono shrink-0 ${badgeBg}`}>
                {selectedLanguage.code}
              </span>
            </div>
            {!compact && (
              <span className="text-[11px] text-slate-400 truncate block">
                {selectedLanguage.name} • {selectedLanguage.category === 'Indian' ? 'Indian (Official)' : selectedLanguage.category === 'Mixed' ? 'Bilingual Mixed' : 'Global Language'}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-w-lg min-w-[300px]">
          {/* Header & Search Bar */}
          <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search language (e.g. Telugu, Hindi, தமிழ், Hinglish, Spanish, 日本語)..."
                className="w-full bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                className={`px-2.5 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'All'
                    ? activeBtnStyle
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                All ({STUDY_LANGUAGES.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('Indian')}
                className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'Indian'
                    ? activeBtnStyle
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>🇮🇳 Indian (22)</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('Mixed')}
                className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'Mixed'
                    ? activeBtnStyle
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>🔀 Bilingual Mixed ({mixedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('Global')}
                className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'Global'
                    ? activeBtnStyle
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>🌐 World ({globalCount})</span>
              </button>
            </div>
          </div>

          {/* Languages List */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-1 divide-y divide-slate-900/50">
            {filteredLanguages.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <p className="text-xs font-semibold">No languages found</p>
                <p className="text-[11px] text-slate-500">Try searching for another name or script</p>
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = selectedLanguage.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      onChange(lang);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition text-left cursor-pointer group ${
                      isSelected
                        ? `${badgeBg} border`
                        : 'hover:bg-slate-900/90 text-slate-200 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{lang.flag || '🌐'}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                            {lang.nativeName}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-800/80 text-slate-400 font-mono border border-slate-700/50">
                            {lang.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {lang.name} • {lang.description || (lang.category === 'Indian' ? 'Official Indian Language' : lang.category === 'Mixed' ? 'Bilingual Mode' : 'Global Language')}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition shrink-0">
                        Select
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer stats */}
          <div className="px-3.5 py-2 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Languages className="w-3 h-3 text-indigo-400" />
              <span>Full Multilingual Study Engine</span>
            </span>
            <span className="font-semibold text-slate-300">
              {filteredLanguages.length} Available
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
