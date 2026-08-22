import React, { useState, useEffect } from 'react';
import { StudySet, ProcessingConfig } from './types';
import { NoteUploader } from './components/NoteUploader';
import { StudyDashboard } from './components/StudyDashboard';
import { SavedSetsModal } from './components/SavedSetsModal';
import { StudyLanguageSelector } from './components/StudyLanguageSelector';
import { StudyLanguage, findLanguageByCode } from './data/languages';
import {
  GraduationCap,
  Sparkles,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import {
  safeLoadFromLocalStorage,
  loadSetsFromIndexedDB,
  safeSaveToLocalStorage,
  saveSetsToIndexedDB,
  createThumbnailDataUrl,
} from './utils/storage';

export function App() {
  const [activeSet, setActiveSet] = useState<StudySet | null>(null);
  const [savedSets, setSavedSets] = useState<StudySet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isTranslatingActiveSet, setIsTranslatingActiveSet] = useState(false);

  const [globalStudyLanguage, setGlobalStudyLanguage] = useState<StudyLanguage>(() => {
    try {
      const saved = localStorage.getItem('study_assistant_language_code');
      if (saved) {
        return findLanguageByCode(saved);
      }
    } catch (e) {}
    return findLanguageByCode('te-IN');
  });

  // Load saved sets on mount (fast initial read from localStorage, full sync from IndexedDB)
  useEffect(() => {
    // Immediate synchronous load
    const initialSets = safeLoadFromLocalStorage();
    if (initialSets.length > 0) {
      setSavedSets(initialSets);
    }

    // Background full sync from IndexedDB
    loadSetsFromIndexedDB().then((dbSets) => {
      if (dbSets && dbSets.length > 0) {
        setSavedSets(dbSets);
      }
    }).catch(() => {
      // Ignored: safe fallback in place
    });
  }, []);

  const saveSetsToStorage = async (sets: StudySet[]) => {
    setSavedSets(sets);
    // Asynchronous full persistence in IndexedDB
    saveSetsToIndexedDB(sets);
    // Safe lightweight mirroring to localStorage
    safeSaveToLocalStorage(sets);
  };

  const handleSelectLanguage = (lang: StudyLanguage) => {
    setGlobalStudyLanguage(lang);
    try {
      localStorage.setItem('study_assistant_language_code', lang.code);
    } catch (e) {}

    // If an active study set is present, update its language metadata
    if (activeSet) {
      handleUpdateStudySet({
        ...activeSet,
        studyLanguage: lang.name,
        studyLanguageCode: lang.code,
      });
    }
  };

  const handleTranslateActiveSet = async (targetLang: StudyLanguage) => {
    if (!activeSet) return;
    setIsTranslatingActiveSet(true);
    try {
      const response = await fetch('/api/translate-study-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studySet: activeSet,
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
        handleUpdateStudySet(result.studySet);
        setGlobalStudyLanguage(targetLang);
        try {
          localStorage.setItem('study_assistant_language_code', targetLang.code);
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('Translation failed:', err);
      setError(`Could not translate study set: ${err.message}`);
    } finally {
      setIsTranslatingActiveSet(false);
    }
  };

  const handleProcessNotes = async (payload: {
    text?: string;
    file?: { mimeType: string; data: string };
    files?: Array<{
      name: string;
      mimeType: string;
      data: string;
      previewUrl?: string;
      size?: number;
      isImage?: boolean;
    }>;
    config: ProcessingConfig;
    title?: string;
    previewUrl?: string;
    previewUrls?: string[];
    tags?: string[];
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/process-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payload.text,
          file: payload.file,
          files: payload.files,
          config: payload.config,
          title: payload.title,
        }),
      });

      let result: any;
      try {
        result = await response.json();
      } catch (parseErr) {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}: Failed to process notes.`);
        }
        throw new Error('Could not read server response. Please try again.');
      }

      if (!response.ok || !result.success) {
        throw new Error(result?.error || 'Failed to process lecture notes.');
      }

      const generated = result.data;
      const uploadedFiles = payload.files || (payload.file ? [{ name: 'Document', mimeType: payload.file.mimeType, data: payload.file.data }] : []);
      const fileCount = uploadedFiles.length;
      const allImages = fileCount > 0 && uploadedFiles.every((f) => f.mimeType?.startsWith('image/'));
      const allPdfs = fileCount > 0 && uploadedFiles.every((f) => f.mimeType === 'application/pdf' || f.mimeType?.includes('pdf'));
      const hasAudio = fileCount > 0 && uploadedFiles.some((f) => f.mimeType?.startsWith('audio/') || (f as any).isAudio);

      let calculatedSourceType: StudySet['sourceType'] = 'text';
      if (fileCount > 1) {
        calculatedSourceType = 'batch';
      } else if (fileCount === 1) {
        calculatedSourceType = hasAudio ? 'audio' : allImages ? 'image' : allPdfs ? 'pdf' : 'pdf';
      }

      const sourceFilesList = uploadedFiles.map((f) => f.name).filter(Boolean);
      const rawPreviewImagesList = payload.previewUrls || (payload.previewUrl ? [payload.previewUrl] : uploadedFiles.map((f) => f.previewUrl).filter(Boolean) as string[]);

      // Create compressed lightweight thumbnails for safe storage and fast rendering
      const compressedPreviews = await Promise.all(
        rawPreviewImagesList.slice(0, 4).map((p) => createThumbnailDataUrl(p, 300, 300, 0.7))
      );

      const newStudySet: StudySet = {
        id: 'set_' + Date.now(),
        title: generated.title || payload.title || 'Untitled Study Set',
        tags: payload.tags && payload.tags.length > 0 ? payload.tags : undefined,
        sourceType: calculatedSourceType,
        sourceName:
          payload.title ||
          (fileCount > 1
            ? `${fileCount} Files Batch (${sourceFilesList.slice(0, 2).join(', ')}${fileCount > 2 ? ` +${fileCount - 2}` : ''})`
            : fileCount === 1
            ? uploadedFiles[0].name || (allImages ? 'Uploaded Image' : 'PDF Document')
            : 'Lecture Notes'),
        sourceFiles: sourceFilesList,
        createdAt: new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        summary: generated.summary,
        flashcards: generated.flashcards,
        quiz: generated.quiz,
        previewImage: compressedPreviews[0] || undefined,
        previewImages: compressedPreviews.length > 0 ? compressedPreviews : undefined,
      };

      const updatedSets = [newStudySet, ...savedSets];
      await saveSetsToStorage(updatedSets);
      setActiveSet(newStudySet);
    } catch (err: any) {
      console.error('Process notes error:', err);
      const msg = err?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('Load failed') || msg.includes('NetworkError')) {
        setError('Network request failed. If you uploaded large files, please try uploading smaller files or try again in a moment.');
      } else {
        setError(msg || 'An error occurred while generating your study set. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSet = (set: StudySet) => {
    setActiveSet(set);
    setIsLibraryOpen(false);
  };

  const handleDeleteSet = (id: string) => {
    const updated = savedSets.filter((s) => s.id !== id);
    saveSetsToStorage(updated);
    if (activeSet?.id === id) {
      setActiveSet(updated[0] || null);
    }
  };

  const handleUpdateStudySet = (updated: StudySet) => {
    setActiveSet(updated);
    const newSets = savedSets.map((s) => (s.id === updated.id ? updated : s));
    saveSetsToStorage(newSets);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => setActiveSet(null)}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-slate-100 tracking-tight">Smart Study Assistant</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI Study Tutor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* STUDY LANGUAGE 🌐 - Placed directly beside / before SAVED SETS */}
            <StudyLanguageSelector
              currentLanguageCode={activeSet?.studyLanguageCode || globalStudyLanguage.code}
              onSelectLanguage={handleSelectLanguage}
              onTranslateSet={activeSet ? handleTranslateActiveSet : undefined}
              isTranslating={isTranslatingActiveSet}
              showTranslateOption={!!activeSet}
            />

            {/* Saved Sets Library Modal Trigger */}
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              <span>Saved Sets</span>
              {savedSets.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] font-bold">
                  {savedSets.length}
                </span>
              )}
            </button>

            {activeSet && (
              <button
                onClick={() => setActiveSet(null)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Notes</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Global Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Unable to generate study set</p>
                <p className="text-rose-300/90 mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-200 font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Dynamic View: Uploader vs Dashboard */}
        {!activeSet ? (
          <NoteUploader
            onProcess={handleProcessNotes}
            isLoading={isLoading}
            error={error}
            studyLanguage={globalStudyLanguage.name}
            studyLanguageCode={globalStudyLanguage.code}
          />
        ) : (
          <StudyDashboard
            studySet={activeSet}
            onNewMaterial={() => setActiveSet(null)}
            onUpdateStudySet={handleUpdateStudySet}
          />
        )}
      </main>

      {/* Saved Sets Library Modal */}
      <SavedSetsModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        savedSets={savedSets}
        activeSetId={activeSet?.id}
        onSelectSet={handleSelectSet}
        onDeleteSet={handleDeleteSet}
        onUpdateSet={handleUpdateStudySet}
      />
    </div>
  );
}

export default App;
