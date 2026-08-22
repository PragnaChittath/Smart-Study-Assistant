import React from 'react';
import { Sparkles, Library, PlusCircle } from 'lucide-react';
import { StudySet } from '../types';

interface HeaderProps {
  activeSet: StudySet | null;
  savedSets: StudySet[];
  onSelectSet: (set: StudySet) => void;
  onNewMaterial: () => void;
  onOpenLibrary: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSet,
  savedSets,
  onSelectSet,
  onNewMaterial,
  onOpenLibrary,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 sm:px-8 py-3.5 shadow-md transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand logo & title */}
        <div
          className="flex items-center gap-3.5 cursor-pointer group select-none"
          onClick={onNewMaterial}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
              Smart Study Assistant
            </h1>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AI Multimodal
            </span>
          </div>
        </div>

        {/* Right actions toolbar */}
        <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
          {activeSet && savedSets.length > 0 && (
            <div className="hidden lg:flex items-center gap-2.5 max-w-xs mr-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Active:</span>
              <select
                value={activeSet.id}
                onChange={(e) => {
                  const found = savedSets.find((s) => s.id === e.target.value);
                  if (found) onSelectSet(found);
                }}
                className="text-xs bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate cursor-pointer transition-colors"
              >
                {savedSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-750 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer active:scale-95"
            title="Saved Study Library"
          >
            <Library className="w-4 h-4 text-indigo-400" />
            <span>Library ({savedSets.length})</span>
          </button>

          <button
            onClick={onNewMaterial}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-600/35 hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Study Note</span>
          </button>
        </div>
      </div>
    </header>
  );
};

