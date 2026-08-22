import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, StudySet } from '../types';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Mic,
  Square,
  Volume2,
  Play,
  Pause,
  Upload,
  Radio,
  Globe,
  Keyboard,
  Trash2,
} from 'lucide-react';
import { StudyLanguage, STUDY_LANGUAGES, findLanguageByCode, findLanguageByName } from '../data/languages';
import { TutorLanguageControls } from './TutorLanguageControls';
import { VirtualScriptKeyboard } from './VirtualScriptKeyboard';

interface TutorChatProps {
  studySet: StudySet;
}

export const TutorChat: React.FC<TutorChatProps> = ({ studySet }) => {
  // Input Language (Default to Telugu or the active study language)
  const [inputLanguage, setInputLanguage] = useState<StudyLanguage>(() => {
    if (studySet.studyLanguageCode) return findLanguageByCode(studySet.studyLanguageCode);
    if (studySet.studyLanguage) return findLanguageByName(studySet.studyLanguage);
    return findLanguageByName('Telugu');
  });

  // Output Language (Default to English or active study language)
  const [outputLanguage, setOutputLanguage] = useState<StudyLanguage>(() => {
    if (studySet.studyLanguageCode && studySet.studyLanguageCode !== 'te-IN') {
      return findLanguageByCode(studySet.studyLanguageCode);
    }
    return findLanguageByName('English');
  });

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `Hello! I'm your AI Study Assistant for "${studySet.title}". Ask me any follow-up questions in text or speak using your microphone in ANY language!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioInputFileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const quickPrompts = [
    'Explain the most difficult concept in simple terms',
    'Give me a real-world analogy for this topic',
    'What are 3 likely exam essay questions?',
    'Summarize key formulas/definitions',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  const handleInsertChar = (char: string) => {
    if (textInputRef.current) {
      const start = textInputRef.current.selectionStart ?? input.length;
      const end = textInputRef.current.selectionEnd ?? input.length;
      const nextVal = input.substring(0, start) + char + input.substring(end);
      setInput(nextVal);
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
          textInputRef.current.setSelectionRange(start + char.length, start + char.length);
        }
      }, 10);
    } else {
      setInput((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    if (textInputRef.current) {
      const start = textInputRef.current.selectionStart ?? input.length;
      const end = textInputRef.current.selectionEnd ?? input.length;
      if (start === end && start > 0) {
        const nextVal = input.substring(0, start - 1) + input.substring(end);
        setInput(nextVal);
        setTimeout(() => {
          if (textInputRef.current) {
            textInputRef.current.focus();
            textInputRef.current.setSelectionRange(start - 1, start - 1);
          }
        }, 10);
      } else if (start !== end) {
        const nextVal = input.substring(0, start) + input.substring(end);
        setInput(nextVal);
        setTimeout(() => {
          if (textInputRef.current) {
            textInputRef.current.focus();
            textInputRef.current.setSelectionRange(start, start);
          }
        }, 10);
      }
    } else {
      setInput((prev) => prev.slice(0, -1));
    }
  };

  const startVoiceRecording = async () => {
    audioChunksRef.current = [];
    setChatError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setChatError('Microphone access is not supported by your browser. You can upload an audio file instead.');
        setTimeout(() => setChatError(null), 5000);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        handleProcessVoiceBlob(audioBlob, mimeType, recordingDuration);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setChatError('Could not access microphone. Please verify device permissions or upload an audio file.');
      setTimeout(() => setChatError(null), 5000);
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleProcessVoiceBlob = (blob: Blob, mimeType: string, duration: number) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1] || '';
      sendVoiceMessage({
        mimeType,
        data: base64Data,
        duration,
      });
    };
    reader.readAsDataURL(blob);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1] || '';
      sendVoiceMessage({
        mimeType: file.type || 'audio/mp3',
        data: base64Data,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendVoiceMessage = async (audioPayload: { mimeType: string; data: string; duration?: number }) => {
    const durationLabel = audioPayload.duration ? ` (${formatTime(audioPayload.duration)})` : '';
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: `🎤 Spoken Voice Query in ${inputLanguage.name}${durationLabel}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      audio: audioPayload,
      isVoice: true,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ text: m.text, sender: m.sender })),
          studyContext: studySet,
          audio: audioPayload,
          studyLanguage: outputLanguage.name,
          studyLanguageCode: outputLanguage.code,
          inputLanguage: inputLanguage.name,
          inputLanguageCode: inputLanguage.code,
          outputLanguage: outputLanguage.name,
          outputLanguageCode: outputLanguage.code,
        }),
      });

      const data = await res.json();
      const assistantReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply || 'I could not generate a response for your audio question.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantReply]);
    } catch (e) {
      console.error('Chat error:', e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Sorry, I encountered a network error while analyzing your spoken question. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ text: m.text, sender: m.sender })),
          studyContext: studySet,
          studyLanguage: outputLanguage.name,
          studyLanguageCode: outputLanguage.code,
          inputLanguage: inputLanguage.name,
          inputLanguageCode: inputLanguage.code,
          outputLanguage: outputLanguage.name,
          outputLanguageCode: outputLanguage.code,
        }),
      });

      const data = await res.json();
      const assistantReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply || 'I could not generate a response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantReply]);
    } catch (e) {
      console.error('Chat error:', e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Sorry, I encountered a network error while answering. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[670px] overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">AI Study Tutor</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20 flex items-center gap-1">
                <Mic className="w-2.5 h-2.5" /> Multilingual Voice &amp; Chat
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Grounded in "{studySet.title}"</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Active Tutor
        </span>
      </div>

      {/* Multilingual Input & Output Language Controls Toolbar */}
      <TutorLanguageControls
        inputLanguage={inputLanguage}
        outputLanguage={outputLanguage}
        onSelectInputLanguage={(lang) => {
          setInputLanguage(lang);
          // If the user selected a non-English Indian language, open the script keyboard for them
          if (lang.category === 'Indian') {
            setIsKeyboardOpen(true);
          }
        }}
        onSelectOutputLanguage={(lang) => setOutputLanguage(lang)}
        isKeyboardOpen={isKeyboardOpen}
        onToggleKeyboard={() => setIsKeyboardOpen((prev) => !prev)}
      />

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[85%] ${
              m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-indigo-400 border border-slate-700'
              }`}
            >
              {m.sender === 'user' ? (
                m.isVoice ? <Mic className="w-3.5 h-3.5 text-rose-300" /> : <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/80 rounded-tl-none'
              }`}
            >
              {m.isVoice && (
                <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-indigo-400/30 text-[11px] font-semibold text-indigo-100">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Multimodal Voice Question</span>
                </div>
              )}
              <p className="whitespace-pre-line">{m.text}</p>
              <span className="block text-[10px] opacity-60 text-right mt-1">{m.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700 shrink-0 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-800/80 text-slate-400 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Formulating response in {outputLanguage.name}...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 overflow-x-auto whitespace-nowrap flex items-center gap-2">
        <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" /> Quick:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading || isRecording}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition shrink-0 cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Virtual Script Keyboard (Collapsible above input) */}
      {isKeyboardOpen && (
        <div className="px-3 pt-2 bg-slate-950/90 border-t border-indigo-500/20">
          <VirtualScriptKeyboard
            languageCode={inputLanguage.code}
            languageName={inputLanguage.name}
            onInsertChar={handleInsertChar}
            onBackspace={handleBackspace}
            onClose={() => setIsKeyboardOpen(false)}
          />
        </div>
      )}

      {/* Input Bar & Voice Controls */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex flex-col gap-2">
        {chatError && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
            <span>{chatError}</span>
            <button
              type="button"
              onClick={() => setChatError(null)}
              className="text-rose-400 hover:text-rose-200 ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hidden Audio File Input */}
        <input
          type="file"
          ref={audioInputFileRef}
          onChange={handleAudioUpload}
          accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
          className="hidden"
        />

        {isRecording ? (
          /* Active Voice Recording UI */
          <div className="flex items-center justify-between gap-3 p-2 bg-rose-950/40 border border-rose-500/40 rounded-xl animate-pulse">
            <div className="flex items-center gap-2.5 text-rose-300 text-xs font-semibold">
              <Radio className="w-4 h-4 text-rose-400 animate-spin" />
              <span>Listening in {inputLanguage.name} • {formatTime(recordingDuration)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Send Voice Query</span>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Input Bar with Multilingual Keyboard, Voice & Audio Buttons */
          <div className="flex items-center gap-2">
            {/* Multilingual Keyboard / Language Button */}
            <button
              type="button"
              onClick={() => setIsKeyboardOpen((prev) => !prev)}
              className={`p-2.5 rounded-xl border transition shrink-0 cursor-pointer shadow-sm active:scale-95 flex items-center gap-1 ${
                isKeyboardOpen
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/30'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-indigo-300 hover:text-white'
              }`}
              title={`Toggle Multilingual Script Keyboard for ${inputLanguage.name}`}
            >
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">
                {inputLanguage.prefix}
              </span>
            </button>

            {/* Spoken Voice Recording Button */}
            <button
              type="button"
              onClick={startVoiceRecording}
              disabled={loading}
              title={`Record voice query with microphone in ${inputLanguage.name}`}
              className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 hover:from-rose-500/30 hover:to-indigo-500/30 border border-rose-500/30 hover:border-rose-500 text-rose-300 hover:text-rose-200 transition shrink-0 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Upload Audio Clip Button */}
            <button
              type="button"
              onClick={() => audioInputFileRef.current?.click()}
              disabled={loading}
              title="Upload audio recording / voice clip"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
            </button>

            <input
              ref={textInputRef}
              type="text"
              placeholder={`Ask in ${inputLanguage.name}... (AI answers in ${outputLanguage.name})`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

