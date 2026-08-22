import React, { useState, useRef, useEffect } from 'react';
import { StudySet, QuizQuestion } from '../types';
import { SummaryView } from './SummaryView';
import { FlashcardDeck } from './FlashcardDeck';
import { QuizView } from './QuizView';
import { TutorChat } from './TutorChat';
import { PodcastPlayer } from './PodcastPlayer';
import { MindMapView } from './MindMapView';
import { ComparisonView } from './ComparisonView';
import { VivaInterviewSimulator } from './VivaInterviewSimulator';
import {
  BookOpen,
  Layers,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
  Download,
  FileText,
  FileCode,
  Check,
  ChevronDown,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Radio,
  Headphones,
  Sparkles,
  Network,
  GitCompare,
  Tag,
  Plus,
  Mic,
} from 'lucide-react';
import { getTagColorClass } from './SavedSetsModal';
import { StudyLanguage, findLanguageByCode } from '../data/languages';
import {
  generateMarkdownExport,
  generateTextExport,
  downloadFile,
} from '../utils/exportUtils';

interface StudyDashboardProps {
  studySet: StudySet;
  onNewMaterial: () => void;
  onUpdateStudySet: (updatedSet: StudySet) => void;
}

export const StudyDashboard: React.FC<StudyDashboardProps> = ({
  studySet,
  onNewMaterial,
  onUpdateStudySet,
}) => {
  const isMultiFile = !!(studySet.sourceFiles && studySet.sourceFiles.length >= 2);
  const [activeTab, setActiveTab] = useState<'summary' | 'compare' | 'mindmap' | 'podcast' | 'flashcards' | 'quiz' | 'tutor' | 'viva'>(
    studySet.comparison && isMultiFile ? 'compare' : 'summary'
  );
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isTranslatingLanguage, setIsTranslatingLanguage] = useState(false);
  const [translationMessage, setTranslationMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tagEditorRef = useRef<HTMLDivElement>(null);

  const handleTranslateStudySet = async (targetLang: StudyLanguage) => {
    setIsTranslatingLanguage(true);
    setTranslationMessage(`Adapting & translating study set into ${targetLang.nativeName}...`);
    try {
      const response = await fetch('/api/translate-study-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studySet,
          targetLanguage: targetLang.name,
          targetLanguageCode: targetLang.code,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to translate study set');
      }

      const result = await response.json();
      if (result.success && result.studySet) {
        onUpdateStudySet(result.studySet);
        setTranslationMessage(`Successfully translated into ${targetLang.nativeName}!`);
        setTimeout(() => setTranslationMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Translation failed:', err);
      setTranslationMessage(`Could not translate study set: ${err.message || 'Unknown error'}`);
      setTimeout(() => setTranslationMessage(null), 5000);
    } finally {
      setIsTranslatingLanguage(false);
    }
  };

  const PRESET_DASHBOARD_TAGS = [
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

  const previewImages =
    studySet.previewImages && studySet.previewImages.length > 0
      ? studySet.previewImages
      : studySet.previewImage
      ? [studySet.previewImage]
      : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (tagEditorRef.current && !tagEditorRef.current.contains(event.target as Node)) {
        setIsTagEditorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTagToActiveSet = (tagToAdd: string) => {
    const clean = tagToAdd.trim();
    if (!clean) return;
    const currentTags = studySet.tags || [];
    if (currentTags.includes(clean)) return;
    onUpdateStudySet({
      ...studySet,
      tags: [...currentTags, clean],
    });
    setNewTagInput('');
  };

  const handleRemoveTagFromActiveSet = (tagToRemove: string) => {
    const currentTags = studySet.tags || [];
    onUpdateStudySet({
      ...studySet,
      tags: currentTags.filter((t) => t !== tagToRemove),
    });
  };

  const handleUpdateQuiz = (newQuiz: QuizQuestion[]) => {
    onUpdateStudySet({
      ...studySet,
      quiz: newQuiz,
    });
  };

  const handleExportMarkdown = () => {
    setShowExportMenu(false);
    const md = generateMarkdownExport(studySet);
    downloadFile(`${studySet.title.replace(/\s+/g, '_')}_StudyGuide.md`, md, 'text/markdown');
  };

  const handleExportText = () => {
    setShowExportMenu(false);
    const txt = generateTextExport(studySet);
    downloadFile(`${studySet.title.replace(/\s+/g, '_')}_Notes.txt`, txt, 'text/plain');
  };

  const handleCopyMarkdown = () => {
    setShowExportMenu(false);
    const md = generateMarkdownExport(studySet);
    navigator.clipboard.writeText(md);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2200);
  };

  const getSourceTypeBadge = () => {
    switch (studySet.sourceType) {
      case 'batch':
        return { label: 'Multi-File Batch', icon: <Layers className="w-3 h-3 text-indigo-400" /> };
      case 'image':
        return { label: 'Image / Photo Note', icon: <ImageIcon className="w-3 h-3 text-indigo-400" /> };
      case 'pdf':
        return { label: 'PDF Document', icon: <FileText className="w-3 h-3 text-violet-400" /> };
      case 'sample':
        return { label: 'Sample Material', icon: <BookOpen className="w-3 h-3 text-indigo-400" /> };
      default:
        return { label: 'Lecture Notes', icon: <FileText className="w-3 h-3 text-indigo-400" /> };
    }
  };

  const sourceBadge = getSourceTypeBadge();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Title & Action Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
        {/* Left: Back & Title info */}
        <div className="flex items-start gap-4">
          <button
            onClick={onNewMaterial}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-750 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-x-0.5 shrink-0 mt-0.5 cursor-pointer active:scale-95"
            title="Upload Different Notes or Files"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Active Study Set</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {sourceBadge.icon}
                <span>{sourceBadge.label}</span>
              </span>
              {studySet.sourceFiles && studySet.sourceFiles.length > 1 && (
                <span className="text-xs font-medium text-slate-400">
                  • {studySet.sourceFiles.length} files synthesized
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">{studySet.title}</h2>

            {/* Tags & Categories Row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 relative" ref={tagEditorRef}>
              {(studySet.tags || []).map((tag) => {
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-medium border bg-slate-900 text-slate-300 border-slate-800 transition"
                  >
                    <Tag className="w-2.5 h-2.5 opacity-70" />
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTagFromActiveSet(tag)}
                      className="text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-full p-0.5 transition cursor-pointer"
                      title={`Remove tag "${tag}"`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}

              {/* Add Tag button */}
              <button
                type="button"
                onClick={() => setIsTagEditorOpen(!isTagEditorOpen)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                  isTagEditorOpen
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
                title="Add Category / Tag"
              >
                <Plus className="w-3 h-3" />
                <span>{(studySet.tags && studySet.tags.length > 0) ? 'Add Tag' : 'Tag Set'}</span>
              </button>

              {/* Tag Editor Popover */}
              {isTagEditorOpen && (
                <div className="absolute top-full left-0 mt-2 z-40 w-72 sm:w-80 p-3.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      Add Category / Tag
                    </span>
                    <button
                      onClick={() => setIsTagEditorOpen(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Preset Suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_DASHBOARD_TAGS.map((preset) => {
                      const isAlreadyAdded = (studySet.tags || []).includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={isAlreadyAdded}
                          onClick={() => handleAddTagToActiveSet(preset)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-xl border transition cursor-pointer ${
                            isAlreadyAdded
                              ? 'bg-slate-950 text-slate-500 border-slate-900 opacity-40 cursor-not-allowed'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {isAlreadyAdded ? `✓ ${preset}` : `+ ${preset}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom tag input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Type custom tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTagToActiveSet(newTagInput);
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTagToActiveSet(newTagInput)}
                      disabled={!newTagInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Generous Spaced Action Toolbar */}
        <div className="flex items-center gap-3.5 flex-wrap xl:flex-nowrap justify-start xl:justify-end pt-2 xl:pt-0 border-t border-slate-800/60 xl:border-t-0">
          {/* Compare Documents Action Button */}
          {(isMultiFile || studySet.comparison) && (
            <button
              onClick={() => setActiveTab('compare')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-md hover:shadow-lg ${
                activeTab === 'compare'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white ring-2 ring-cyan-400/40 shadow-indigo-600/30'
                  : 'bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 hover:text-white shadow-indigo-950/60 hover:-translate-y-0.5'
              }`}
              title="View side-by-side comparative analysis matrix"
            >
              <GitCompare className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span>{studySet.comparison ? 'Comparison' : 'Compare Docs'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 font-extrabold border border-cyan-400/30">
                Matrix
              </span>
            </button>
          )}

          {/* Generate / Open Concept Diagram Action Button */}
          <button
            onClick={() => setActiveTab('mindmap')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-md hover:shadow-lg ${
              activeTab === 'mindmap'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white ring-2 ring-cyan-400/40 shadow-cyan-600/30'
                : 'bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 hover:text-white shadow-cyan-950/60 hover:-translate-y-0.5'
            }`}
            title="Generate or view interactive Concept Diagram"
          >
            <Network className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span>Concept Diagram</span>
            {!studySet.mindMap && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 font-extrabold border border-cyan-400/30">
                Visual
              </span>
            )}
          </button>

          {/* Generate Mini Podcast Action Button */}
          <button
            onClick={() => setActiveTab('podcast')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-md hover:shadow-lg ${
              activeTab === 'podcast'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white ring-2 ring-violet-400/40 shadow-violet-600/30'
                : 'bg-violet-950/70 hover:bg-violet-900/80 border border-violet-500/40 text-violet-200 hover:text-white shadow-violet-950/60 hover:-translate-y-0.5'
            }`}
            title="Generate or listen to a 5-minute conversational podcast recap"
          >
            <Radio className="w-4 h-4 text-violet-300 animate-pulse" />
            <span>{studySet.podcast ? 'Mini Podcast' : 'Mini Podcast'}</span>
            {!studySet.podcast && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/30 text-violet-200 font-extrabold border border-violet-400/30">
                Audio
              </span>
            )}
          </button>

          {/* Viva / Interview Simulator Action Button */}
          <button
            onClick={() => setActiveTab('viva')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-md hover:shadow-lg ${
              activeTab === 'viva'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white ring-2 ring-indigo-400/40 shadow-indigo-600/30'
                : 'bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 hover:text-white shadow-indigo-950/60 hover:-translate-y-0.5'
            }`}
            title="Launch AI Oral Viva & Interview Simulator"
          >
            <Mic className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>Viva Simulator</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-extrabold border border-indigo-400/30">
              Exam
            </span>
          </button>

          {previewImages.length > 0 && (
            <button
              onClick={() => setSelectedPhotoIndex(0)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 hover:text-indigo-100 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm"
              title="View Uploaded Source Image(s)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {previewImages.length > 1 ? `Photos (${previewImages.length})` : 'Source Photo'}
              </span>
            </button>
          )}

          {/* Export Options dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              title="Export Study Material"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2.5 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95">
                <button
                  onClick={handleExportMarkdown}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-indigo-600/20 rounded-xl transition text-left cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-violet-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Export Markdown (.md)</div>
                    <div className="text-[10px] text-slate-400">Obsidian, Notion, GitHub</div>
                  </div>
                </button>

                <button
                  onClick={handleExportText}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-indigo-600/20 rounded-xl transition text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Export Plain Text (.txt)</div>
                    <div className="text-[10px] text-slate-400">Clean readable notes</div>
                  </div>
                </button>

                <div className="border-t border-slate-800 my-1 pt-1.5">
                  <button
                    onClick={handleCopyMarkdown}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-indigo-600/20 rounded-xl transition text-left cursor-pointer"
                  >
                    {copiedNotification ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold">
                        {copiedNotification ? 'Copied to Clipboard!' : 'Copy Full Study Guide'}
                      </div>
                      <div className="text-[10px] text-slate-400">Formatted Markdown text</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Translation & Adaptation Status Banner */}
      {(isTranslatingLanguage || translationMessage) && (
        <div
          className={`flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border text-xs font-semibold shadow-lg transition-all animate-in fade-in ${
            isTranslatingLanguage
              ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
              : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isTranslatingLanguage ? (
              <span className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{translationMessage}</span>
          </div>
          {isTranslatingLanguage && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Adapting all 5 Modules
            </span>
          )}
        </div>
      )}

      {/* Main Tab Switcher with Generous Spacing and Rounded Borders */}
      <div className="flex border border-slate-800/80 bg-slate-900/70 p-2 rounded-2xl sm:rounded-3xl gap-2 overflow-x-auto shadow-inner">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Summary &amp; Notes</span>
        </button>

        {/* Compare Documents / Images Tab */}
        {(isMultiFile || studySet.comparison) && (
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex-1 min-w-[135px] py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
              activeTab === 'compare'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <span>Compare Docs</span>
            {studySet.comparison && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Comparison Matrix Ready" />
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('mindmap')}
          className={`flex-1 min-w-[135px] py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'mindmap'
              ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Network className="w-4 h-4 text-cyan-400" />
          <span>Concept Diagram</span>
          {studySet.mindMap && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Concept Diagram Ready" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('podcast')}
          className={`flex-1 min-w-[135px] py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'podcast'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Radio className="w-4 h-4 text-violet-400" />
          <span>Mini Podcast</span>
          {studySet.podcast && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Episode Ready" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'flashcards'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3D Flashcards ({studySet.flashcards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Practice Quiz ({studySet.quiz.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tutor')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'tutor'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>AI Study Tutor</span>
        </button>

        {/* Viva / Interview Simulator Tab (placed next to AI Study Tutor) */}
        <button
          onClick={() => setActiveTab('viva')}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'viva'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Mic className="w-4 h-4 text-indigo-400" />
          <span>Viva / Interview</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === 'summary' && (
          <SummaryView
            summary={studySet.summary}
            sourceName={studySet.sourceName}
            onOpenComparison={() => setActiveTab('compare')}
            hasComparison={!!studySet.comparison}
            isMultiFile={isMultiFile}
          />
        )}

        {activeTab === 'compare' && (
          <ComparisonView
            studySet={studySet}
            onUpdateStudySet={onUpdateStudySet}
          />
        )}

        {activeTab === 'mindmap' && (
          <MindMapView
            studySet={studySet}
            onUpdateStudySet={onUpdateStudySet}
          />
        )}

        {activeTab === 'podcast' && (
          <PodcastPlayer
            studySet={studySet}
            onUpdateStudySet={onUpdateStudySet}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardDeck flashcards={studySet.flashcards} title={studySet.title} />
        )}

        {activeTab === 'quiz' && (
          <QuizView
            quiz={studySet.quiz}
            studySet={studySet}
            onUpdateQuiz={handleUpdateQuiz}
          />
        )}

        {activeTab === 'tutor' && <TutorChat studySet={studySet} />}

        {activeTab === 'viva' && (
          <VivaInterviewSimulator
            initialStudySet={studySet}
            onBackToDashboard={() => setActiveTab('summary')}
          />
        )}
      </div>

      {/* Image Source Lightbox Modal with Multi-Image Navigation */}
      {selectedPhotoIndex !== null && previewImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-slate-100 truncate">
                  {studySet.title} — Original Uploaded Photo
                </span>
                {previewImages.length > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700 shrink-0">
                    {selectedPhotoIndex + 1} / {previewImages.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative p-4 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)] bg-black/50 select-none">
              {previewImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhotoIndex((prev) =>
                        prev !== null && prev > 0 ? prev - 1 : previewImages.length - 1
                      )
                    }
                    className="absolute left-4 z-10 p-2 rounded-full bg-slate-900/80 border border-slate-700 text-white hover:bg-indigo-600 transition shadow-lg cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhotoIndex((prev) =>
                        prev !== null && prev < previewImages.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="absolute right-4 z-10 p-2 rounded-full bg-slate-900/80 border border-slate-700 text-white hover:bg-indigo-600 transition shadow-lg cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <img
                src={previewImages[selectedPhotoIndex]}
                alt={`${studySet.title} Photo ${selectedPhotoIndex + 1}`}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
