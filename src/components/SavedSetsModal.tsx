import React, { useState, useMemo } from 'react';
import { StudySet } from '../types';
import {
  X,
  BookOpen,
  Trash2,
  Calendar,
  FileText,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Tag,
  Search,
  Plus,
  Check,
  Filter,
} from 'lucide-react';

interface SavedSetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedSets: StudySet[];
  activeSetId?: string;
  onSelectSet: (set: StudySet) => void;
  onDeleteSet: (id: string) => void;
  onUpdateSet?: (updatedSet: StudySet) => void;
}

const PRESET_TAG_SUGGESTIONS = [
  'Biology',
  'History',
  'Exam Prep',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Economics',
  'Literature',
  'Mathematics',
  'Midterms',
  'Finals',
];

// Helper to generate uniform neutral styling for tags
export function getTagColorClass(_tag?: string): { bg: string; text: string; border: string } {
  return { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-800' };
}

export const SavedSetsModal: React.FC<SavedSetsModalProps> = ({
  isOpen,
  onClose,
  savedSets,
  activeSetId,
  onSelectSet,
  onDeleteSet,
  onUpdateSet,
}) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingTagSetId, setAddingTagSetId] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

  // Collect all unique tags and their occurrence counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    savedSets.forEach((set) => {
      if (set.tags && Array.isArray(set.tags)) {
        set.tags.forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) {
            counts[trimmed] = (counts[trimmed] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [savedSets]);

  const uniqueTags = useMemo(() => {
    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  }, [tagCounts]);

  // Filtered study sets
  const filteredSets = useMemo(() => {
    return savedSets.filter((set) => {
      // 1. Tag filter
      if (selectedTag) {
        if (!set.tags || !set.tags.includes(selectedTag)) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = set.title?.toLowerCase().includes(query);
        const overviewMatch = set.summary?.highLevelOverview?.toLowerCase().includes(query);
        const tagMatch = set.tags?.some((t) => t.toLowerCase().includes(query));
        const sourceMatch = set.sourceName?.toLowerCase().includes(query);
        if (!titleMatch && !overviewMatch && !tagMatch && !sourceMatch) {
          return false;
        }
      }

      return true;
    });
  }, [savedSets, selectedTag, searchQuery]);

  if (!isOpen) return null;

  const handleAddTag = (set: StudySet, tagToAdd: string) => {
    const cleanTag = tagToAdd.trim();
    if (!cleanTag) return;

    const existingTags = set.tags || [];
    if (existingTags.includes(cleanTag)) return;

    const updatedTags = [...existingTags, cleanTag];
    const updatedSet: StudySet = {
      ...set,
      tags: updatedTags,
    };

    if (onUpdateSet) {
      onUpdateSet(updatedSet);
    }
    setCustomTagInput('');
  };

  const handleRemoveTag = (e: React.MouseEvent, set: StudySet, tagToRemove: string) => {
    e.stopPropagation();
    const existingTags = set.tags || [];
    const updatedTags = existingTags.filter((t) => t !== tagToRemove);
    const updatedSet: StudySet = {
      ...set,
      tags: updatedTags,
    };

    if (onUpdateSet) {
      onUpdateSet(updatedSet);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/25 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-100">Saved Study Sets</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-300 font-bold">
                  {savedSets.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Organize with tags (e.g. Biology, History, Exam Prep) & search your library
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/40 space-y-3">
          {/* Search Input Field */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="saved-sets-search-input"
              type="text"
              placeholder="Search study sets by title or tags (e.g. Biology, Exam Prep)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl pl-10 pr-24 py-2.5 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {filteredSets.length} {filteredSets.length === 1 ? 'match' : 'matches'}
                </span>
                <button
                  id="saved-sets-clear-search-btn"
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tag Filter Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3 text-indigo-400" />
              <span>Tags:</span>
            </span>

            {/* All Chips Button */}
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer ${
                selectedTag === null
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              All ({savedSets.length})
            </button>

            {/* Unique Tag Chips */}
            {uniqueTags.map((tag) => {
              const isSelected = selectedTag === tag;
              const count = tagCounts[tag] || 0;

              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Tag className="w-3 h-3 opacity-70" />
                  <span>{tag}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-950 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* If no unique tags exist yet, show preset suggested tags */}
            {uniqueTags.length === 0 && (
              <span className="text-xs text-slate-500 italic shrink-0">
                (No tags created yet — add tags below to categorize)
              </span>
            )}
          </div>
        </div>

        {/* Modal Body: Saved Set Cards List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 max-h-[60vh]">
          {savedSets.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-xs space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-200 text-sm">No saved study sets yet.</p>
              <p className="max-w-md mx-auto text-slate-400">
                Upload lecture notes, photos of diagrams, or select a sample set to generate and categorize your study packs.
              </p>
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/80 p-6">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-200 text-sm">No matching study sets</p>
                <p className="text-slate-400 mt-1">
                  {selectedTag
                    ? `No study sets tagged with "${selectedTag}".`
                    : `No results found for "${searchQuery}".`}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedTag(null);
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredSets.map((set) => {
              const isActive = set.id === activeSetId;
              const isAddingTag = addingTagSetId === set.id;
              const setTags = set.tags || [];

              return (
                <div
                  key={set.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row items-start justify-between gap-4 ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/50'
                      : 'bg-slate-950/50 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex-1 min-w-0 w-full">
                    {/* Title & Badges */}
                    <div
                      className="cursor-pointer group"
                      onClick={() => onSelectSet(set)}
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-100 group-hover:text-indigo-300 transition">
                          {set.title}
                        </span>
                        {set.sourceType === 'image' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            <ImageIcon className="w-2.5 h-2.5" />
                            Photo Note
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500 text-white shadow-sm">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {set.summary?.highLevelOverview || 'Comprehensive AI study pack and active recall flashcards.'}
                      </p>
                    </div>

                    {/* Tags & Categories Row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {setTags.map((tag) => {
                        const color = getTagColorClass(tag);
                        return (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-xl text-[11px] font-bold border transition ${color.bg} ${color.text} ${color.border}`}
                          >
                            <Tag className="w-2.5 h-2.5 opacity-70" />
                            <span>{tag}</span>
                            {onUpdateSet && (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveTag(e, set, tag)}
                                className="text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-full p-0.5 transition cursor-pointer"
                                title={`Remove tag "${tag}"`}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </span>
                        );
                      })}

                      {/* Add Tag Button / Popover Toggle */}
                      {onUpdateSet && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isAddingTag) {
                              setAddingTagSetId(null);
                            } else {
                              setAddingTagSetId(set.id);
                              setCustomTagInput('');
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            isAddingTag
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tag</span>
                        </button>
                      )}
                    </div>

                    {/* Inline Tag Popover / Adder */}
                    {isAddingTag && (
                      <div className="p-3.5 bg-slate-900 border border-slate-700/80 rounded-2xl space-y-2.5 mb-3 shadow-xl animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-400" />
                            Add Tag to "{set.title.slice(0, 30)}..."
                          </span>
                          <button
                            onClick={() => setAddingTagSetId(null)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Preset Quick-Click Suggestions */}
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_TAG_SUGGESTIONS.map((preset) => {
                            const isAlreadyAdded = setTags.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                disabled={isAlreadyAdded}
                                onClick={() => handleAddTag(set, preset)}
                                className={`text-[10px] font-bold px-2 py-0.8 rounded-lg border transition cursor-pointer ${
                                  isAlreadyAdded
                                    ? 'bg-slate-800 text-slate-500 border-slate-800 opacity-40 cursor-not-allowed'
                                    : 'bg-slate-950 hover:bg-indigo-950/70 text-slate-300 hover:text-indigo-200 border-slate-800 hover:border-indigo-500/40'
                                }`}
                              >
                                {isAlreadyAdded ? `✓ ${preset}` : `+ ${preset}`}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Tag Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Type custom tag (e.g. Finals 2026, Chapter 4)..."
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag(set, customTagInput);
                              }
                            }}
                            className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTag(set, customTagInput)}
                            disabled={!customTagInput.trim()}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center gap-3.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        {set.flashcards.length} Cards • {set.quiz.length} Quiz Qs
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {set.createdAt}
                      </span>
                      {set.sourceName && (
                        <span className="text-slate-500 truncate max-w-[200px]">
                          • {set.sourceName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                    <button
                      onClick={() => onSelectSet(set)}
                      className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSet(set.id)}
                      className="p-2 rounded-2xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/25 transition cursor-pointer"
                      title="Delete Study Set"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
