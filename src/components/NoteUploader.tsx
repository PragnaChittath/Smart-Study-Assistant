import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  BookOpen,
  Brain,
  Cpu,
  TrendingUp,
  AlertCircle,
  Loader2,
  Settings,
  ArrowRight,
  Image as ImageIcon,
  Eye,
  X,
  ZoomIn,
  Plus,
  Trash2,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  GitCompare,
  CheckCircle2,
  Mic,
  Volume2,
  Play,
  Pause,
  Radio,
  Globe,
  Square,
  Tag,
} from 'lucide-react';
import { ProcessingConfig, SampleNote, UploadedFileItem } from '../types';
import { SAMPLE_NOTES } from '../data/sampleNotes';
import { VoiceRecorderModal } from './VoiceRecorderModal';
import { getTagColorClass } from './SavedSetsModal';

interface NoteUploaderProps {
  onProcess: (payload: {
    text?: string;
    file?: { mimeType: string; data: string };
    files?: UploadedFileItem[];
    config: ProcessingConfig;
    title?: string;
    previewUrl?: string;
    previewUrls?: string[];
    tags?: string[];
  }) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
  studyLanguage?: string;
  studyLanguageCode?: string;
}

interface SelectedFileState extends UploadedFileItem {
  id: string;
  isImage: boolean;
  isAudio?: boolean;
  isPdf?: boolean;
  dimensions?: { width: number; height: number };
}

export const NoteUploader: React.FC<NoteUploaderProps> = ({
  onProcess,
  isLoading,
  error,
  studyLanguage = 'Telugu',
  studyLanguageCode = 'te-IN',
}) => {
  const [activeTab, setActiveTab] = useState<'samples' | 'upload' | 'paste'>('samples');
  const [pastedText, setPastedText] = useState('');
  const [pastedImages, setPastedImages] = useState<SelectedFileState[]>([]);
  const [clipboardMessage, setClipboardMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const clipboardMessageTimeoutRef = useRef<any>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileState[]>([]);
  const [selectedSample, setSelectedSample] = useState<SampleNote>(SAMPLE_NOTES[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newUploaderTag, setNewUploaderTag] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Audio preview player state for uploaded files
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [config, setConfig] = useState<ProcessingConfig>({
    detailLevel: 'standard',
    flashcardCount: 8,
    quizQuestionCount: 5,
    compareMode: false,
    studyLanguage: 'English',
    studyLanguageCode: 'en-US',
  });
  const [compareMode, setCompareMode] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  const processFile = (file: File): Promise<SelectedFileState> => {
    return new Promise((resolve, reject) => {
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|webm|ogg|aac|flac)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

      let mimeType = file.type;
      if (!mimeType) {
        if (isImg) {
          mimeType = file.name.toLowerCase().endsWith('.png')
            ? 'image/png'
            : file.name.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';
        } else if (isAudio) {
          mimeType = file.name.toLowerCase().endsWith('.mp3')
            ? 'audio/mp3'
            : file.name.toLowerCase().endsWith('.wav')
            ? 'audio/wav'
            : file.name.toLowerCase().endsWith('.m4a')
            ? 'audio/m4a'
            : 'audio/webm';
        } else {
          mimeType = 'application/pdf';
        }
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] || '';
        const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        if (isImg) {
          const img = new Image();
          img.onload = () => {
            resolve({
              id,
              name: file.name,
              size: file.size,
              mimeType,
              data: base64Data,
              previewUrl: result,
              isImage: true,
              isPdf: false,
              isAudio: false,
              dimensions: { width: img.naturalWidth, height: img.naturalHeight },
            });
          };
          img.onerror = () => {
            resolve({
              id,
              name: file.name,
              size: file.size,
              mimeType,
              data: base64Data,
              previewUrl: result,
              isImage: true,
              isPdf: false,
              isAudio: false,
            });
          };
          img.src = result;
        } else if (isAudio) {
          resolve({
            id,
            name: file.name,
            size: file.size,
            mimeType,
            data: base64Data,
            previewUrl: URL.createObjectURL(file),
            isImage: false,
            isPdf: false,
            isAudio: true,
          });
        } else {
          resolve({
            id,
            name: file.name,
            size: file.size,
            mimeType,
            data: base64Data,
            previewUrl: undefined,
            isImage: false,
            isPdf: true,
            isAudio: false,
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleIncomingFiles = async (filesList: FileList | File[]) => {
    setUploadError(null);
    const oversizedFiles: string[] = [];
    const validFiles = Array.from(filesList).filter((file) => {
      if (file.size > 35 * 1024 * 1024) {
        oversizedFiles.push(file.name);
        return false;
      }
      return true;
    });

    if (oversizedFiles.length > 0) {
      setUploadError(`File(s) exceed the 35MB limit: ${oversizedFiles.join(', ')}. Please choose smaller files.`);
      setTimeout(() => setUploadError(null), 6000);
    }

    if (validFiles.length === 0) return;

    try {
      const processed = await Promise.all(validFiles.map((f) => processFile(f)));
      setSelectedFiles((prev) => {
        const updated = [...prev, ...processed];
        if (!customTitle && updated.length > 0) {
          if (updated.length === 1) {
            setCustomTitle(updated[0].name.replace(/\.[^/.]+$/, ''));
          } else {
            const firstClean = updated[0].name.replace(/\.[^/.]+$/, '');
            setCustomTitle(`${firstClean} (+${updated.length - 1} files)`);
          }
        }
        return updated;
      });
    } catch (err) {
      console.error('Error processing uploaded files:', err);
      setUploadError('Failed to process one or more uploaded files. Please verify file integrity.');
      setTimeout(() => setUploadError(null), 6000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playingAudioId === id && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingAudioId(null);
    }
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAllFiles = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingAudioId(null);
    }
    setSelectedFiles([]);
  };

  const handleAddVoiceAudio = (audioItem: UploadedFileItem) => {
    const id = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newFile: SelectedFileState = {
      ...audioItem,
      id,
      isImage: false,
      isPdf: false,
      isAudio: true,
    };
    setSelectedFiles((prev) => [newFile, ...prev]);
    if (!customTitle) {
      setCustomTitle('Spoken Lecture & Voice Query');
    }
    setActiveTab('upload');
  };

  const togglePlayAudioItem = (file: SelectedFileState, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!file.previewUrl) return;

    if (playingAudioId === file.id && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    const audio = new Audio(file.previewUrl);
    currentAudioRef.current = audio;
    setPlayingAudioId(file.id);

    audio.onended = () => {
      setPlayingAudioId(null);
    };
    audio.onerror = () => {
      setPlayingAudioId(null);
    };
    audio.play().catch((err) => {
      console.error('Audio play error:', err);
      setPlayingAudioId(null);
    });
  };

  const showClipboardFeedback = (text: string, isError = false) => {
    if (clipboardMessageTimeoutRef.current) clearTimeout(clipboardMessageTimeoutRef.current);
    setClipboardMessage({ text, isError });
    clipboardMessageTimeoutRef.current = setTimeout(() => {
      setClipboardMessage(null);
    }, 4000);
  };

  const handlePasteImageFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        showClipboardFeedback('Clipboard image read API is not accessible in this browser. Use Ctrl+V / Cmd+V inside the text box instead.', true);
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      let attachedCount = 0;

      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
          const file = new File([blob], `pasted_image_${Date.now()}_${attachedCount + 1}.${ext}`, { type: imageType });
          const processed = await processFile(file);
          setPastedImages((prev) => [...prev, processed]);
          attachedCount++;
        }
      }

      if (attachedCount > 0) {
        showClipboardFeedback(`Attached ${attachedCount} image${attachedCount > 1 ? 's' : ''} from your clipboard!`);
      } else {
        showClipboardFeedback('No image found in your clipboard. Please copy a screenshot or diagram first, then click Paste Image or press Ctrl+V.', true);
      }
    } catch (err: any) {
      console.warn('Clipboard read error:', err);
      showClipboardFeedback('Could not access clipboard directly. Please focus the text area and press Ctrl+V / Cmd+V to paste your image.', true);
    }
  };

  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      try {
        const processed = await Promise.all(imageFiles.map((f) => processFile(f)));
        setPastedImages((prev) => [...prev, ...processed]);
        showClipboardFeedback(`Pasted ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} into your study notes!`);
      } catch (err) {
        console.error('Failed to process pasted image', err);
        showClipboardFeedback('Failed to process pasted image.', true);
      }
    }
  };

  // Inline Voice Tab Recorder functions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'upload') {
      if (selectedFiles.length === 0) return;

      const payloadFiles: UploadedFileItem[] = selectedFiles.map((f) => ({
        name: f.name,
        mimeType: f.mimeType,
        data: f.data,
        size: f.size,
        previewUrl: f.previewUrl,
        isImage: f.isImage,
        isAudio: f.isAudio,
        isPdf: f.isPdf,
        audioDuration: f.audioDuration,
      }));

      const imagePreviews = selectedFiles
        .filter((f) => f.isImage && f.previewUrl)
        .map((f) => f.previewUrl as string);

      const effectiveCompare = compareMode || selectedFiles.length >= 2;
      const effectiveConfig = {
        ...config,
        studyLanguage: studyLanguage || config.studyLanguage || 'Telugu',
        studyLanguageCode: studyLanguageCode || config.studyLanguageCode || 'te-IN',
        compareMode: effectiveCompare,
      };

      onProcess({
        files: payloadFiles,
        file: payloadFiles.length === 1 ? { mimeType: payloadFiles[0].mimeType, data: payloadFiles[0].data } : undefined,
        config: effectiveConfig,
        title: customTitle || (selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} Uploaded Files (${effectiveCompare ? 'Comparative Study' : 'Combined Study'})`),
        previewUrl: imagePreviews[0],
        previewUrls: imagePreviews,
        tags: selectedTags,
      });
    } else if (activeTab === 'paste') {
      if (!pastedText.trim() && pastedImages.length === 0) return;
      const effectiveConfig = {
        ...config,
        studyLanguage: studyLanguage || config.studyLanguage || 'Telugu',
        studyLanguageCode: studyLanguageCode || config.studyLanguageCode || 'te-IN',
      };

      const payloadFiles: UploadedFileItem[] = pastedImages.map((f) => ({
        name: f.name,
        mimeType: f.mimeType,
        data: f.data,
        size: f.size,
        previewUrl: f.previewUrl,
        isImage: f.isImage,
      }));

      const imagePreviews = pastedImages
        .filter((f) => f.isImage && f.previewUrl)
        .map((f) => f.previewUrl as string);

      onProcess({
        text: pastedText.trim() || undefined,
        files: payloadFiles.length > 0 ? payloadFiles : undefined,
        file: payloadFiles.length === 1 ? { mimeType: payloadFiles[0].mimeType, data: payloadFiles[0].data } : undefined,
        config: effectiveConfig,
        title: customTitle || (pastedText.trim() ? (pastedText.trim().slice(0, 40).replace(/\n/g, ' ') + (pastedText.trim().length > 40 ? '...' : '')) : (pastedImages.length === 1 ? pastedImages[0].name : `${pastedImages.length} Pasted Images Study Set`)),
        previewUrl: imagePreviews[0],
        previewUrls: imagePreviews,
        tags: selectedTags,
      });
    } else if (activeTab === 'samples') {
      const isCompareSample = selectedSample.id === 'physics-comparison';
      const effectiveConfig = {
        ...config,
        studyLanguage: studyLanguage || config.studyLanguage || 'Telugu',
        studyLanguageCode: studyLanguageCode || config.studyLanguageCode || 'te-IN',
        compareMode: isCompareSample,
      };
      onProcess({
        text: selectedSample.content,
        config: effectiveConfig,
        title: selectedSample.title,
        tags: selectedTags,
      });
    }
  };

  const getSampleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain':
        return <Brain className="w-5 h-5 text-pink-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'GitCompare':
        return <GitCompare className="w-5 h-5 text-cyan-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-indigo-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Image files for lightbox navigation
  const imageFiles =
    activeTab === 'paste'
      ? pastedImages.filter((f) => f.isImage && f.previewUrl)
      : selectedFiles.filter((f) => f.isImage && f.previewUrl);
  const currentLightboxImage = lightboxIndex !== null ? imageFiles[lightboxIndex] : null;

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const totalImages = selectedFiles.filter((f) => f.isImage).length;
  const totalPdfs = selectedFiles.filter((f) => f.isPdf || (!f.isImage && !f.isAudio)).length;
  const totalAudios = selectedFiles.filter((f) => f.isAudio).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Multimodal AI Study Companion (Vision + Voice + Docs)</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          Turn Notes, Photos, PDFs &amp; Spoken Voice into Mastered Knowledge
        </h2>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-200">Processing Notice:</span> {error}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-semibold transition shrink-0 self-end sm:self-auto cursor-pointer"
          >
            Retry Generation
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm">
        {/* Source selector tabs - Clean, Symmetrical 3-Option Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-800 bg-slate-950/80 p-2 gap-2">
          {/* Option 1: Interactive Samples */}
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>Interactive Samples</span>
          </button>

          {/* Option 2: Upload Files */}
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>Upload Files {selectedFiles.length > 0 && `(${selectedFiles.length})`}</span>
          </button>

          {/* Option 3: Paste Notes */}
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Paste Notes</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* TAB 1: PRE-LOADED SAMPLES */}
          {activeTab === 'samples' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select a topic to test instantly:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SAMPLE_NOTES.map((sample) => {
                  const isSelected = selectedSample.id === sample.id;
                  return (
                    <div
                      key={sample.id}
                      onClick={() => setSelectedSample(sample)}
                      className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 ${
                        isSelected
                          ? 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/15'
                          : 'bg-slate-800/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shadow-sm">
                            {getSampleIcon(sample.iconName)}
                          </span>
                          <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/15 px-2.5 py-1 rounded-full border border-indigo-500/30">
                            {sample.subject}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 mb-1.5 line-clamp-2">
                          {sample.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{sample.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span>~1,200 words</span>
                        <span className={isSelected ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
                          {isSelected ? 'Selected' : 'Click to select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD MULTIPLE FILES (IMAGES + DOCUMENTS + AUDIO) */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {uploadError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-rose-400 hover:text-rose-200 font-bold ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Drag and Drop Zone with PDF, Image & Voice Input Buttons */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4 group ${
                  isDraggingOver
                    ? 'border-indigo-400 bg-indigo-950/50 scale-[0.99]'
                    : 'border-slate-700/80 hover:border-indigo-500/70 bg-slate-950/50 hover:bg-slate-950/80'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.mp3,.wav,.m4a,.webm,.ogg,.aac,image/png,image/jpeg,image/webp,application/pdf,audio/*"
                  className="hidden"
                />

                {/* Triple Media Icons: Images + PDFs + Spoken Voice Mic */}
                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/25 group-hover:scale-105 transition-transform duration-200 shadow-md" title="Images & Photos">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="w-13 h-13 rounded-2xl bg-violet-500/15 text-violet-400 flex items-center justify-center border border-violet-500/25 group-hover:scale-105 transition-transform duration-200 shadow-md" title="PDF Documents">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowVoiceModal(true);
                    }}
                    className="w-13 h-13 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/35 group-hover:scale-105 transition-transform duration-200 hover:bg-rose-500/30 shadow-md"
                    title="Voice Recording / Spoken Query"
                  >
                    <Mic className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-lg">
                  <p className="text-base font-bold text-slate-100">
                    {selectedFiles.length > 0
                      ? 'Add more study photos, PDFs, or audio recordings'
                      : 'Drop your study photos, PDFs, or audio recordings here'}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select multiple files: <span className="text-indigo-400 font-semibold">Images &amp; Diagrams</span>, <span className="text-violet-400 font-semibold">PDF Documents</span>, and <span className="text-rose-400 font-semibold">Spoken Voice Clips (Any Language)</span>
                  </p>
                </div>

                {/* Direct Action Buttons with Generous Spacing and Margins */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>Upload Images &amp; PDFs</span>
                  </button>

                  {/* VOICE INPUT BUTTON NEXT TO PDF & IMAGE UPLOADS */}
                  <button
                    type="button"
                    onClick={() => setShowVoiceModal(true)}
                    className="text-xs px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500/20 to-indigo-500/20 hover:from-rose-500/30 hover:to-indigo-500/30 text-rose-300 hover:text-rose-100 border border-rose-500/40 hover:border-rose-400 font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Mic className="w-4 h-4 text-rose-400" />
                    <span>Voice Input / Record Mic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioFileInputRef.current?.click()}
                    className="text-xs px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-violet-400" />
                    <span>Upload Audio Clip</span>
                  </button>
                  <input
                    type="file"
                    ref={audioFileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
                    className="hidden"
                  />
                </div>
              </div>

              {/* ATTACHED FILES LIST & BATCH DASHBOARD */}
              {selectedFiles.length > 0 && (
                <div className="rounded-3xl bg-slate-950/90 border border-slate-800 p-5 space-y-4 shadow-md">
                  {/* Summary Bar with Generous Spacing */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm">
                        <Layers className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-100 block sm:inline">
                          {selectedFiles.length} {selectedFiles.length === 1 ? 'Attachment' : 'Attachments'} Ready
                        </span>
                        <span className="text-[11px] text-slate-400 sm:ml-2">
                          ({totalImages > 0 ? `${totalImages} photo${totalImages > 1 ? 's' : ''}` : ''}
                          {totalImages > 0 && totalPdfs > 0 ? ', ' : ''}
                          {totalPdfs > 0 ? `${totalPdfs} PDF${totalPdfs > 1 ? 's' : ''}` : ''}
                          {(totalImages > 0 || totalPdfs > 0) && totalAudios > 0 ? ', ' : ''}
                          {totalAudios > 0 ? `${totalAudios} audio clip${totalAudios > 1 ? 's' : ''}` : ''} • {formatFileSize(totalBytes)})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Add Files</span>
                      </button>

                      {/* Record voice shortcut in summary bar */}
                      <button
                        type="button"
                        onClick={() => setShowVoiceModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/35 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer active:scale-95"
                      >
                        <Mic className="w-3.5 h-3.5 text-rose-400" />
                        <span>+ Spoken Voice</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllFiles}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-transparent hover:border-rose-500/30 transition-all duration-200 cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-File Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedFiles.map((file, idx) => {
                      if (file.isImage && file.previewUrl) {
                        const imgIdx = imageFiles.findIndex((img) => img.id === file.id);
                        return (
                          <div
                            key={file.id}
                            className="group relative rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col justify-between hover:border-indigo-500/50 transition-all duration-200 shadow-sm"
                          >
                            <div
                              onClick={() => setLightboxIndex(imgIdx >= 0 ? imgIdx : 0)}
                              className="relative h-32 w-full bg-black/40 overflow-hidden cursor-zoom-in flex items-center justify-center"
                            >
                              <img
                                src={file.previewUrl}
                                alt={file.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                                <ZoomIn className="w-4 h-4" />
                                <span>Preview Fullscreen</span>
                              </div>
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-sm border border-slate-800 text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                                <ImageIcon className="w-2.5 h-2.5" />
                                #{idx + 1}
                              </span>
                            </div>

                            <div className="p-3 flex items-center justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-200 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {formatFileSize(file.size)}
                                  {file.dimensions ? ` • ${file.dimensions.width}×${file.dimensions.height}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveFile(file.id, e)}
                                title="Remove file"
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (file.isAudio) {
                        const isThisPlaying = playingAudioId === file.id;
                        return (
                          <div
                            key={file.id}
                            className="rounded-2xl border border-rose-500/30 bg-slate-900/95 p-3.5 flex items-center justify-between gap-3 hover:border-rose-500/60 transition shadow-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => togglePlayAudioItem(file, e)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer shadow-md ${
                                  isThisPlaying
                                    ? 'bg-rose-600 text-white ring-2 ring-rose-400/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                                }`}
                                title={isThisPlaying ? 'Pause' : 'Play audio preview'}
                              >
                                {isThisPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <Mic className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <p className="text-xs font-semibold text-slate-200 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                </div>
                                <p className="text-[10px] text-rose-300">
                                  {formatFileSize(file.size)} • Spoken Voice Recording
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRemoveFile(file.id, e)}
                              title="Remove audio"
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition shrink-0 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      }

                      // PDF / Document Item
                      return (
                        <div
                          key={file.id}
                          className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 flex items-center justify-between gap-3 hover:border-violet-500/50 transition shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0 shadow-sm">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-200 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatFileSize(file.size)} • PDF Document
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveFile(file.id, e)}
                            title="Remove document"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition shrink-0 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compare Documents / Images Mode Card */}
                  {selectedFiles.length >= 2 ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-indigo-950/50 border border-cyan-500/30 text-xs text-cyan-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0 mt-0.5 shadow-sm">
                          <GitCompare className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap font-bold text-slate-100 text-xs">
                            <span>'Compare Documents / Images' Mode</span>
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] uppercase font-mono border border-cyan-500/30">
                              2+ Files Detected
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Gemini will perform a structured side-by-side comparative analysis: highlighting key similarities, distinct differences, contradicting statements, and a consolidated synthesized takeaway in a neat markdown comparison table.
                          </p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2.5 shrink-0 self-end sm:self-center cursor-pointer select-none bg-slate-900/90 px-4 py-2 rounded-xl border border-cyan-500/40 hover:border-cyan-400 transition shadow-sm">
                        <input
                          type="checkbox"
                          checked={compareMode}
                          onChange={(e) => setCompareMode(e.target.checked)}
                          className="rounded text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-cyan-200">
                          {compareMode ? 'Comparison Enabled' : 'Enable Comparison'}
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">
                        <strong>Multimodal Vision &amp; Speech Analysis:</strong> Gemini AI will analyze diagrams, handwritten notes, textbook pages, formulas, and spoken recordings to build a structured study set.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    selectedFiles.length > 1
                      ? "e.g. Midterm Review: Cell Biology & Biochemistry Slides"
                      : selectedFiles.length === 1 && selectedFiles[0].isImage
                      ? "e.g. Bio 101: Light Reactions Diagram"
                      : selectedFiles.length === 1 && selectedFiles[0].isAudio
                      ? "e.g. Lecture 6: Macroeconomics Monetary Policy Spoken Notes"
                      : "e.g. Chapter 4: Organic Chemistry Mechanisms"
                  }
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                />
              </div>
            </div>
          )}

          {/* TAB 3: PASTE TEXT & IMAGES */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Material / Subject Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. World History: Renaissance &amp; Industrial Revolution"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Paste Lecture Notes, Text or Images
                  </label>

                  {/* 1. DEDICATED "PASTE IMAGE" BUTTON */}
                  <button
                    type="button"
                    onClick={handlePasteImageFromClipboard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-100 border border-indigo-500/40 hover:border-indigo-400 text-xs font-medium transition cursor-pointer shadow-sm active:scale-95"
                    title="Read image/diagram from clipboard (Async Clipboard API)"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Paste Image</span>
                  </button>
                </div>

                {/* 2 & 4. TEXTAREA WITH ONPASTE AND UPDATED PLACEHOLDER */}
                <div className="relative">
                  <textarea
                    rows={8}
                    placeholder="Paste your raw lecture notes, text, or use Ctrl+V to paste diagrams/screenshots..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    onPaste={handleTextareaPaste}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed font-mono"
                  />
                </div>

                {/* Toast / Notification feedback for clipboard paste actions */}
                {clipboardMessage && (
                  <div
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs border animate-in fade-in duration-200 ${
                      clipboardMessage.isError
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {clipboardMessage.isError ? (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    )}
                    <span>{clipboardMessage.text}</span>
                  </div>
                )}

                {/* 3. IMAGE PREVIEW AREA WITH THUMBNAILS & REMOVE ICON */}
                {pastedImages.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <ImageIcon className="w-4 h-4 text-indigo-400" />
                        <span>Pasted Diagrams &amp; Screenshots ({pastedImages.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPastedImages([])}
                        className="text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      >
                        Clear all images
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {pastedImages.map((imgItem, idx) => (
                        <div
                          key={imgItem.id || idx}
                          onClick={() => setLightboxIndex(idx)}
                          className="group relative rounded-xl border border-slate-800 hover:border-indigo-500/50 bg-slate-900 overflow-hidden shadow-sm aspect-video flex items-center justify-center cursor-pointer transition"
                          title="Click to view full resolution"
                        >
                          <img
                            src={imgItem.previewUrl}
                            alt={imgItem.name || `Pasted Image ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="p-1.5 rounded-lg bg-slate-900/80 text-slate-200">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </span>
                            {/* "X" / Delete icon to remove the image */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPastedImages((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white shadow-md transition cursor-pointer"
                              title="Delete this image"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="absolute bottom-1 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/75 text-slate-300 backdrop-blur-xs">
                            {imgItem.dimensions
                              ? `${imgItem.dimensions.width}×${imgItem.dimensions.height}`
                              : formatFileSize(imgItem.size || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CATEGORIES & TAGS SELECTOR */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>Category Study Set Tags</span>
              </label>
              <span className="text-[11px] text-slate-500">Optional</span>
            </div>

            {/* Uniform Tag Pills Grid / Flow */}
            <div className="flex flex-wrap items-center gap-2">
              {Array.from(
                new Set([
                  'Biology',
                  'Chemistry',
                  'Computer Science',
                  'Economics',
                  'Exam Prep',
                  'History',
                  'Literature',
                  'Mathematics',
                  'Neuroscience',
                  'Physics',
                  ...selectedTags,
                ])
              ).map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(selectedTags.filter((t) => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/25 ring-1 ring-indigo-400/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{tag}</span>
                    {isSelected && <X className="w-3 h-3 text-indigo-200 hover:text-white ml-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2 max-w-sm pt-1">
              <input
                type="text"
                placeholder="Add custom tag (e.g. Midterms, Chapter 4)..."
                value={newUploaderTag}
                onChange={(e) => setNewUploaderTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newUploaderTag.trim();
                    if (trimmed && !selectedTags.includes(trimmed)) {
                      setSelectedTags([...selectedTags, trimmed]);
                      setNewUploaderTag('');
                    }
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newUploaderTag.trim();
                  if (trimmed && !selectedTags.includes(trimmed)) {
                    setSelectedTags([...selectedTags, trimmed]);
                    setNewUploaderTag('');
                  }
                }}
                disabled={!newUploaderTag.trim()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs transition cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* GENERATION CONFIGURATION BAR */}
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-slate-300">
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>Options:</span>
              </div>

              {/* Flashcards Count */}
              <div className="flex items-center gap-2">
                <label className="text-slate-400 font-medium">Flashcards:</label>
                <select
                  value={config.flashcardCount}
                  onChange={(e) =>
                    setConfig({ ...config, flashcardCount: parseInt(e.target.value) })
                  }
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  <option value={5}>5 Cards</option>
                  <option value={8}>8 Cards</option>
                  <option value={12}>12 Cards</option>
                  <option value={16}>16 Cards</option>
                </select>
              </div>

              {/* Quiz Count */}
              <div className="flex items-center gap-2">
                <label className="text-slate-400 font-medium">Quiz Qs:</label>
                <select
                  value={config.quizQuestionCount}
                  onChange={(e) =>
                    setConfig({ ...config, quizQuestionCount: parseInt(e.target.value) })
                  }
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={8}>8 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>

              {/* Detail Depth */}
              <div className="flex items-center gap-2">
                <label className="text-slate-400 font-medium">Detail:</label>
                <select
                  value={config.detailLevel}
                  onChange={(e) =>
                    setConfig({ ...config, detailLevel: e.target.value as any })
                  }
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize font-medium cursor-pointer"
                >
                  <option value="concise">Concise</option>
                  <option value="standard">Standard</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>
            </div>

            {/* Submit CTA button */}
            <button
              type="submit"
              disabled={
                isLoading ||
                (activeTab === 'upload' && selectedFiles.length === 0) ||
                (activeTab === 'paste' && !pastedText.trim() && pastedImages.length === 0)
              }
              className="w-full md:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {activeTab === 'paste' && pastedImages.length > 0
                      ? `Analyzing Notes & ${pastedImages.length} Pasted Image${pastedImages.length > 1 ? 's' : ''}...`
                      : selectedFiles.some((f) => f.isAudio)
                      ? 'Listening to Audio & Generating Study Set...'
                      : selectedFiles.length > 1
                      ? 'Synthesizing Multi-File Study Set...'
                      : 'Gemini AI Generating Study Set...'}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {activeTab === 'samples'
                      ? 'Generate from Sample'
                      : activeTab === 'upload' && selectedFiles.length >= 2 && compareMode
                      ? `Compare ${selectedFiles.length} Files with AI`
                      : activeTab === 'paste' && pastedImages.length > 0 && pastedText.trim()
                      ? 'Generate Multimodal Study Set'
                      : 'Generate AI Study Set'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Voice Recorder Modal (accessible via quick voice button in upload zone) */}
      <VoiceRecorderModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onAudioReady={handleAddVoiceAudio}
      />

      {/* Lightbox Modal for High-Resolution Full-Screen Image Preview */}
      {currentLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-white p-3 bg-black/60 rounded-t-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold truncate max-w-md">
                  {currentLightboxImage.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({(lightboxIndex || 0) + 1} of {imageFiles.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview Container */}
            <div className="relative bg-slate-950 flex items-center justify-center overflow-auto max-h-[75vh] w-full border-x border-slate-800">
              <img
                src={currentLightboxImage.previewUrl}
                alt={currentLightboxImage.name}
                className="max-h-[75vh] max-w-full object-contain select-none"
              />
            </div>

            {/* Bottom Nav Bar */}
            <div className="w-full flex items-center justify-between p-3 bg-black/60 rounded-b-xl border border-slate-800 text-xs text-slate-300">
              <button
                type="button"
                disabled={imageFiles.length <= 1}
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev > 0 ? prev - 1 : imageFiles.length - 1) : 0
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-[11px] text-slate-400 font-mono">
                {currentLightboxImage.dimensions
                  ? `${currentLightboxImage.dimensions.width} × ${currentLightboxImage.dimensions.height} px`
                  : `${formatFileSize(currentLightboxImage.size)}`}
              </span>

              <button
                type="button"
                disabled={imageFiles.length <= 1}
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev < imageFiles.length - 1 ? prev + 1 : 0) : 0
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
