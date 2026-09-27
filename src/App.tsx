import React, { useReducer, useState, useEffect } from 'react';
import { StudySet, ProcessingConfig } from './types';
import { NoteUploader } from './components/NoteUploader';
import { StudyDashboard } from './components/StudyDashboard';
import { SavedSetsModal } from './components/SavedSetsModal';
import { StudyLanguageSelector } from './components/StudyLanguageSelector';
import { StudyLanguage, findLanguageByCode } from './data/languages';
import { GraduationCap, Sparkles, FolderOpen, AlertCircle } from 'lucide-react';
import {
  safeLoadFromLocalStorage,
  loadSetsFromIndexedDB,
  safeSaveToLocalStorage,
  saveSetsToIndexedDB,
  createThumbnailDataUrl,
} from './utils/storage';
import { appWorkflowReducer, initialAppWorkflowState } from './utils/appWorkflowState';

export function App() {
  const [workflowState, dispatchWorkflow] = useReducer(appWorkflowReducer, initialAppWorkflowState);
  const [savedSets, setSavedSets] = useState<StudySet[]>([]);
  const [isTranslatingActiveSet, setIsTranslatingActiveSet] = useState(false);

  const [globalStudyLanguage, setGlobalStudyLanguage] = useState<StudyLanguage>(() => {
    try {
      const persisted = localStorage.getItem('study_assistant_language_code');
      if (persisted) {
        return findLanguageByCode(persisted);
      }
    } catch {
      // LocalStorage access fallback
    }
    return findLanguageByCode('te-IN');
  });

  const activeSet = workflowState.currentStudySet;
  const isLoading = workflowState.isProcessing;
  const error = workflowState.errorMessage;
  const isLibraryOpen = workflowState.savedSetsModalOpen;

  // Load saved sets on mount (fast initial read from localStorage, full sync from IndexedDB)
  useEffect(() => {
    const cachedSets = safeLoadFromLocalStorage();
    if (cachedSets.length > 0) {
      setSavedSets(cachedSets);
    }

    loadSetsFromIndexedDB()
      .then((dbSets) => {
        if (dbSets && dbSets.length > 0) {
          setSavedSets(dbSets);
        }
      })
      .catch(() => {
        // Safe fallback already active
      });
  }, []);

  const persistSavedSets = (updatedSets: StudySet[]) => {
    setSavedSets(updatedSets);
    saveSetsToIndexedDB(updatedSets);
    safeSaveToLocalStorage(updatedSets);
  };

  const handleSelectLanguage = (lang: StudyLanguage) => {
    setGlobalStudyLanguage(lang);
    try {
      localStorage.setItem('study_assistant_language_code', lang.code);
    } catch {
      // Non-fatal
    }

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
        } catch {
          // Ignore storage error
        }
      }
    } catch (err: any) {
      console.error('Translation failed:', err);
      dispatchWorkflow({
        type: 'SYNTHESIS_ERROR',
        payload: { error: `Could not translate study set: ${err.message || 'Unknown error'}` },
      });
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
    dispatchWorkflow({ type: 'START_SYNTHESIS', payload: { initialStep: 'Analyzing and synthesizing material...' } });

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
          studyLanguage: payload.config?.studyLanguage || globalStudyLanguage.name,
        }),
      });

      let result: any;
      try {
        result = await response.json();
      } catch {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}: Failed to process notes.`);
        }
        throw new Error('Could not read server response. Please try again.');
      }

      if (!response.ok) {
        throw new Error(result?.error || `Failed to process lecture notes (HTTP ${response.status}).`);
      }

      const generated = result.data || result.studySet || (result.title && result.summary ? result : null);
      if (!generated || !generated.summary) {
        throw new Error(result?.error || 'Failed to generate study set structure.');
      }

      const uploadedFiles =
        payload.files ||
        (payload.file ? [{ name: 'Document', mimeType: payload.file.mimeType, data: payload.file.data }] : []);
      const fileCount = uploadedFiles.length;
      const allImages = fileCount > 0 && uploadedFiles.every((f) => f.mimeType?.startsWith('image/'));
      const allPdfs =
        fileCount > 0 &&
        uploadedFiles.every((f) => f.mimeType === 'application/pdf' || f.mimeType?.includes('pdf'));
      const hasAudio =
        fileCount > 0 && uploadedFiles.some((f) => f.mimeType?.startsWith('audio/') || (f as any).isAudio);

      let calculatedSourceType: StudySet['sourceType'] = 'text';
      if (fileCount > 1) {
        calculatedSourceType = 'batch';
      } else if (fileCount === 1) {
        calculatedSourceType = hasAudio ? 'audio' : allImages ? 'image' : allPdfs ? 'pdf' : 'pdf';
      }

      const sourceFilesList = uploadedFiles.map((f) => f.name).filter(Boolean);
      const rawPreviewImagesList =
        payload.previewUrls ||
        (payload.previewUrl
          ? [payload.previewUrl]
          : (uploadedFiles.map((f) => f.previewUrl).filter(Boolean) as string[]));

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
        studyLanguage: payload.config?.studyLanguage || globalStudyLanguage.name,
        studyLanguageCode: payload.config?.studyLanguageCode || globalStudyLanguage.code,
        summary: generated.summary,
        flashcards: generated.flashcards,
        quiz: generated.quiz,
        previewImage: compressedPreviews[0] || undefined,
        previewImages: compressedPreviews.length > 0 ? compressedPreviews : undefined,
        rawTextSnippet: generated.rawTextSnippet || payload.text,
      };

      const updatedSets = [newStudySet, ...savedSets];
      persistSavedSets(updatedSets);
      dispatchWorkflow({ type: 'SYNTHESIS_SUCCESS', payload: { studySet: newStudySet } });
    } catch (err: any) {
      console.error('Process notes error:', err);
      const msg = err?.message || '';
      const userFacingMsg =
        msg.includes('Failed to fetch') || msg.includes('Load failed') || msg.includes('NetworkError')
          ? 'Network request failed. If you uploaded large files, please try uploading smaller files or try again in a moment.'
          : msg || 'An error occurred while generating your study set. Please try again.';
      dispatchWorkflow({ type: 'SYNTHESIS_ERROR', payload: { error: userFacingMsg } });
    }
  };

  const handleSelectSet = (set: StudySet) => {
    dispatchWorkflow({ type: 'RESTORE_STUDY_SET', payload: { studySet: set } });
  };

  const handleDeleteSet = (id: string) => {
    const updated = savedSets.filter((s) => s.id !== id);
    persistSavedSets(updated);
    if (activeSet?.id === id) {
      if (updated[0]) {
        dispatchWorkflow({ type: 'RESTORE_STUDY_SET', payload: { studySet: updated[0] } });
      } else {
        dispatchWorkflow({ type: 'CLEAR_STUDY_SET' });
      }
    }
  };

  const handleUpdateStudySet = (updated: StudySet) => {
    dispatchWorkflow({ type: 'UPDATE_CURRENT_SET', payload: { studySet: updated } });
    const newSets = savedSets.map((s) => (s.id === updated.id ? updated : s));
    persistSavedSets(newSets);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => dispatchWorkflow({ type: 'CLEAR_STUDY_SET' })}
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
            {/* Study Language Selector */}
            <StudyLanguageSelector
              currentLanguageCode={activeSet?.studyLanguageCode || globalStudyLanguage.code}
              onSelectLanguage={handleSelectLanguage}
              onTranslateSet={activeSet ? handleTranslateActiveSet : undefined}
              isTranslating={isTranslatingActiveSet}
              showTranslateOption={!!activeSet}
            />

            {/* Saved Sets Library Modal Trigger */}
            <button
              onClick={() => dispatchWorkflow({ type: 'TOGGLE_SAVED_SETS_MODAL', payload: true })}
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
                onClick={() => dispatchWorkflow({ type: 'CLEAR_STUDY_SET' })}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Notes</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1">
        {/* Global Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Notice</p>
                <p className="text-rose-300/90 mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => dispatchWorkflow({ type: 'DISMISS_ERROR' })}
                className="text-rose-400 hover:text-rose-200 font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Dynamic View: Uploader vs Workspace Dashboard */}
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
            onNewMaterial={() => dispatchWorkflow({ type: 'CLEAR_STUDY_SET' })}
            onUpdateStudySet={handleUpdateStudySet}
          />
        )}
      </main>

      {/* Saved Sets Library Modal */}
      <SavedSetsModal
        isOpen={isLibraryOpen}
        onClose={() => dispatchWorkflow({ type: 'TOGGLE_SAVED_SETS_MODAL', payload: false })}
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
