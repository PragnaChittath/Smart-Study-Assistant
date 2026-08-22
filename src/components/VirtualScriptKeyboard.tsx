import React, { useState } from 'react';
import { getScriptKeyboardForLanguage, ScriptKeyboardLayout } from '../data/scriptKeyboards';
import { Keyboard, X, Delete, Space, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface VirtualScriptKeyboardProps {
  languageCode: string;
  languageName: string;
  onInsertChar: (char: string) => void;
  onBackspace: () => void;
  onClose: () => void;
}

export const VirtualScriptKeyboard: React.FC<VirtualScriptKeyboardProps> = ({
  languageCode,
  languageName,
  onInsertChar,
  onBackspace,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'vowels' | 'consonants' | 'matras' | 'symbols'>('all');
  const layout = getScriptKeyboardForLanguage(languageCode);

  if (!layout) {
    return (
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-300 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-indigo-400" />
          <span>Standard Latin / QWERTY input mode active for <strong>{languageName}</strong>.</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/95 border border-indigo-500/30 rounded-2xl p-3 shadow-2xl space-y-2.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
            <Keyboard className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-100">{layout.scriptName}</span>
            <span className="text-[10px] text-indigo-300 ml-2 font-medium">Virtual Script Keys</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick tab filters */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vowels')}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                activeTab === 'vowels' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vowels
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('consonants')}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                activeTab === 'consonants' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Consonants
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matras')}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                activeTab === 'matras' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matras
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer ml-1"
            title="Hide virtual script keyboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Characters palette */}
      <div className="max-h-44 overflow-y-auto pr-1 space-y-2 text-xs">
        {/* Vowels */}
        {(activeTab === 'all' || activeTab === 'vowels') && layout.vowels.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vowels / అచ్చులు / स्वर</div>
            <div className="flex flex-wrap gap-1">
              {layout.vowels.map((char, idx) => (
                <button
                  key={`v-${idx}`}
                  type="button"
                  onClick={() => onInsertChar(char)}
                  className="min-w-[30px] h-8 px-2 rounded-lg bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-indigo-500 text-slate-200 font-medium text-sm transition-all duration-100 active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Matras / Diacritics */}
        {(activeTab === 'all' || activeTab === 'matras') && layout.matrasAndDiacritics.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Matras &amp; Guninthalu / గుర్తులు</div>
            <div className="flex flex-wrap gap-1">
              {layout.matrasAndDiacritics.map((char, idx) => (
                <button
                  key={`m-${idx}`}
                  type="button"
                  onClick={() => onInsertChar(char)}
                  className="min-w-[30px] h-8 px-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-600 hover:text-white border border-indigo-800/40 hover:border-indigo-500 text-indigo-200 font-medium text-sm transition-all duration-100 active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Consonants */}
        {(activeTab === 'all' || activeTab === 'consonants') && layout.consonants.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Consonants / హల్లులు / व्यंजन</div>
            <div className="flex flex-wrap gap-1">
              {layout.consonants.map((char, idx) => (
                <button
                  key={`c-${idx}`}
                  type="button"
                  onClick={() => onInsertChar(char)}
                  className="min-w-[30px] h-8 px-2 rounded-lg bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-indigo-500 text-slate-200 font-medium text-sm transition-all duration-100 active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Numbers & Symbols */}
        {(activeTab === 'all' || activeTab === 'symbols') && layout.numbersAndSymbols && layout.numbersAndSymbols.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Numerals &amp; Punctuation</div>
            <div className="flex flex-wrap gap-1">
              {layout.numbersAndSymbols.map((char, idx) => (
                <button
                  key={`n-${idx}`}
                  type="button"
                  onClick={() => onInsertChar(char)}
                  className="min-w-[28px] h-7 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs transition cursor-pointer"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Bar (Space, Backspace) */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Click any character to insert at cursor</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onInsertChar(' ')}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-700"
          >
            <Space className="w-3 h-3" />
            <span>Space</span>
          </button>
          <button
            type="button"
            onClick={onBackspace}
            className="px-3 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Delete character"
          >
            <Delete className="w-3.5 h-3.5" />
            <span>Backspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
