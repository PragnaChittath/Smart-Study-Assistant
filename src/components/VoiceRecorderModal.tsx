import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Check,
  X,
  Upload,
  Globe,
  Radio,
  Volume2,
} from 'lucide-react';
import { UploadedFileItem } from '../types';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAudioReady: (audioItem: UploadedFileItem) => void;
  title?: string;
  subtitle?: string;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onAudioReady,
  title = 'Voice Query / Spoken Note',
  subtitle = 'Speak your question or lecture in any language. Gemini will process it multimodally.',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up on close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopAndReset();
    }
  }, [isOpen]);

  const stopAndReset = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        console.error(e);
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setErrorMessage(null);
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Microphone access is not supported by your browser. Please upload an audio file instead.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission denied. Please allow microphone access in your browser settings or upload an audio file.');
      } else {
        setErrorMessage(`Could not access microphone: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleTogglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|webm|ogg|aac|flac)$/i)) {
      setErrorMessage('Please select a valid audio file (MP3, WAV, M4A, WebM, OGG, AAC).');
      return;
    }

    setErrorMessage(null);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleConfirmAudio = () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1] || '';
      const mime = audioBlob.type || 'audio/webm';
      const ext = mime.includes('mp3') ? 'mp3' : mime.includes('wav') ? 'wav' : mime.includes('m4a') ? 'm4a' : 'webm';
      const fileName = `Voice_Query_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.${ext}`;

      const audioItem: UploadedFileItem = {
        name: fileName,
        mimeType: mime,
        data: base64Data,
        size: audioBlob.size,
        previewUrl: audioUrl || undefined,
        isAudio: true,
        audioDuration: recordingDuration || undefined,
      };

      onAudioReady(audioItem);
      onClose();
    };
    reader.readAsDataURL(audioBlob);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Live Record vs Upload Audio) */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('record');
              stopAndReset();
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'record'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record with Microphone</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              stopAndReset();
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Audio File</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Multilingual Notice */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-100">Multilingual Multimodal Audio:</span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Speak or upload in <strong>any language</strong> (English, Spanish, Hindi, French, Telugu, Mandarin, Arabic, Japanese, German, etc.). Gemini AI processes the raw audio directly!
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: LIVE MICROPHONE RECORDER */}
          {activeTab === 'record' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              {/* Record / Stop Visual Button */}
              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <>
                    <span className="absolute w-24 h-24 rounded-full bg-rose-500/20 animate-ping" />
                    <span className="absolute w-28 h-28 rounded-full bg-rose-500/10 animate-pulse" />
                  </>
                )}

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 cursor-pointer ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-500 ring-4 ring-rose-400/40'
                      : 'bg-gradient-to-tr from-indigo-600 to-rose-500 hover:from-indigo-500 hover:to-rose-400 hover:scale-105'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8 fill-current" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Status and Timer */}
              <div className="text-center">
                {isRecording ? (
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold font-mono">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
                      <span>RECORDING • {formatTime(recordingDuration)}</span>
                    </div>
                    <p className="text-xs text-slate-400">Click the red square when you finish speaking</p>
                  </div>
                ) : audioBlob ? (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                      <Check className="w-4 h-4" /> Recording Ready ({formatTime(recordingDuration)})
                    </span>
                    <p className="text-xs text-slate-400">Review audio below or click to record again</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-200">Click to start recording</p>
                    <p className="text-xs text-slate-400">Speak clearly into your microphone</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD AUDIO FILE */}
          {activeTab === 'upload' && (
            <div className="py-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAudioFileSelect}
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/70 bg-slate-950/40 hover:bg-slate-950/80 rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Volume2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {audioBlob ? 'Click to replace selected audio' : 'Click to select an audio file'}
                </p>
                <p className="text-xs text-slate-400">
                  Supports MP3, WAV, M4A, WebM, OGG, AAC (voice notes, lecture clips)
                </p>
              </div>
            </div>
          )}

          {/* Audio Review / Player Bar */}
          {audioUrl && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-3">
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={handleTogglePlayback}
                  className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shrink-0 cursor-pointer shadow-md"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {(audioBlob as any)?.name || 'Spoken Voice Recording'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {audioBlob ? `${(audioBlob.size / 1024).toFixed(1)} KB` : ''} • Ready for Gemini Multimodal Analysis
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={stopAndReset}
                title="Discard recording"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmAudio}
            disabled={!audioBlob || isRecording}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-bold shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Use Voice Audio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
