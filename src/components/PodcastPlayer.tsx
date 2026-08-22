import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudySet, PodcastData, PodcastLine } from '../types';
import {
  PODCAST_LANGUAGES,
  PodcastLanguage,
  findLanguageByCode,
} from '../data/languages';
import { SearchableLanguageSelect } from './SearchableLanguageSelect';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Mic,
  Headphones,
  Sparkles,
  Volume2,
  VolumeX,
  Settings2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Radio,
  Sliders,
  Globe,
  Languages,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';

interface PodcastPlayerProps {
  studySet: StudySet;
  onUpdateStudySet: (updatedSet: StudySet) => void;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  studySet,
  onUpdateStudySet,
}) => {
  const podcast = studySet.podcast;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Independent Language selection state for Host 1 and Host 2
  const [host1LangCode, setHost1LangCode] = useState<string>(() => {
    return podcast?.host1LanguageCode || podcast?.languageCode || 'en-US';
  });
  const [host2LangCode, setHost2LangCode] = useState<string>(() => {
    return podcast?.host2LanguageCode || podcast?.languageCode || 'en-US';
  });

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // SpeechSynthesis Voices State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [host1VoiceURI, setHost1VoiceURI] = useState<string>('');
  const [host2VoiceURI, setHost2VoiceURI] = useState<string>('');
  const [host1Pitch, setHost1Pitch] = useState<number>(1.0);
  const [host2Pitch, setHost2Pitch] = useState<number>(1.15);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Refs for tracking active speech execution
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentLineIndexRef = useRef(currentLineIndex);
  currentLineIndexRef.current = currentLineIndex;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;
  const lineRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Synchronize language states when studySet podcast data updates
  useEffect(() => {
    if (podcast) {
      if (podcast.host1LanguageCode) {
        setHost1LangCode(podcast.host1LanguageCode);
      } else if (podcast.languageCode) {
        setHost1LangCode(podcast.languageCode);
      }
      if (podcast.host2LanguageCode) {
        setHost2LangCode(podcast.host2LanguageCode);
      } else if (podcast.languageCode) {
        setHost2LangCode(podcast.languageCode);
      }
    }
  }, [podcast?.host1LanguageCode, podcast?.host2LanguageCode, podcast?.languageCode]);

  // Current language objects
  const host1LangObj = findLanguageByCode(host1LangCode);
  const host2LangObj = findLanguageByCode(host2LangCode);

  // Check if current user selections differ from active generated podcast
  const isDifferentLangSelected =
    podcast &&
    ((podcast.host1LanguageCode && podcast.host1LanguageCode !== host1LangCode) ||
      (podcast.host2LanguageCode && podcast.host2LanguageCode !== host2LangCode) ||
      (!podcast.host1LanguageCode && podcast.languageCode !== host1LangCode) ||
      (!podcast.host2LanguageCode && podcast.languageCode !== host2LangCode));

  // 1. Initialize and auto-assign SpeechSynthesis Voices for Host 1 and Host 2
  const assignVoicesForLanguages = useCallback(
    (availableVoices: SpeechSynthesisVoice[], h1Code: string, h2Code: string) => {
      if (!availableVoices || availableVoices.length === 0) return;

      const h1Prefix = h1Code.split('-')[0].toLowerCase();
      const h2Prefix = h2Code.split('-')[0].toLowerCase();

      // Find matching voices for Host 1
      const h1Voices = availableVoices.filter((v) => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        return vLang === h1Code.toLowerCase() || vLang.startsWith(h1Prefix);
      });

      // Find matching voices for Host 2
      const h2Voices = availableVoices.filter((v) => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        return vLang === h2Code.toLowerCase() || vLang.startsWith(h2Prefix);
      });

      // Host 1 voice selection
      const pool1 = h1Voices.length > 0 ? h1Voices : availableVoices;
      const naturalVoice1 =
        pool1.find((v) =>
          /natural|google|samantha|daniel|karen|alex|lekha|madhav|neerja|heera/i.test(
            v.name
          )
        ) || pool1[0];

      if (naturalVoice1) {
        setHost1VoiceURI(naturalVoice1.voiceURI);
      }

      // Host 2 voice selection (try to pick distinct voice)
      const pool2 = h2Voices.length > 0 ? h2Voices : availableVoices;
      const naturalVoice2 =
        pool2.find(
          (v) =>
            /natural|google|victoria|fiona|moira|tom|george|swara|valluvar|ananya/i.test(
              v.name
            ) && v.voiceURI !== (naturalVoice1?.voiceURI || '')
        ) ||
        pool2.find((v) => v.voiceURI !== (naturalVoice1?.voiceURI || '')) ||
        pool2[0];

      if (naturalVoice2) {
        setHost2VoiceURI(naturalVoice2.voiceURI);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechSupported(false);
      return;
    }

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        setVoices(availableVoices);
        assignVoicesForLanguages(
          availableVoices,
          podcast?.host1LanguageCode || host1LangCode,
          podcast?.host2LanguageCode || host2LangCode
        );
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [
    podcast?.host1LanguageCode,
    podcast?.host2LanguageCode,
    host1LangCode,
    host2LangCode,
    assignVoicesForLanguages,
  ]);

  // Handle generation progress text animation
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setGenerationStep((prev) => (prev + 1) % 4);
      }, 2400);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // 2. Generate Podcast from Gemini API with dual independent languages
  const handleGeneratePodcast = async (
    overrideH1Code?: string,
    overrideH2Code?: string
  ) => {
    const h1CodeToUse = overrideH1Code || host1LangCode;
    const h2CodeToUse = overrideH2Code || host2LangCode;

    const h1Obj = findLanguageByCode(h1CodeToUse);
    const h2Obj = findLanguageByCode(h2CodeToUse);

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep(0);

    // Stop any ongoing playback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }

    try {
      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyContext: {
            title: studySet.title,
            summary: studySet.summary,
            rawTextSnippet: studySet.rawTextSnippet,
          },
          host1Language: h1Obj.name,
          host1LanguageCode: h1Obj.code,
          host2Language: h2Obj.name,
          host2LanguageCode: h2Obj.code,
          language: h1Obj.code === h2Obj.code ? h1Obj.name : `${h1Obj.name} & ${h2Obj.name}`,
          languageCode: h1Obj.code === h2Obj.code ? h1Obj.code : `${h1Obj.code}+${h2Obj.code}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Server responded with status ${response.status}`
        );
      }

      const result = await response.json();
      if (!result.podcast) {
        throw new Error('No podcast dialogue generated. Please try again.');
      }

      const updatedSet: StudySet = {
        ...studySet,
        podcast: result.podcast,
      };

      onUpdateStudySet(updatedSet);
      setCurrentLineIndex(0);
      setHost1LangCode(h1Obj.code);
      setHost2LangCode(h2Obj.code);
    } catch (err: any) {
      console.error('Failed to generate podcast:', err);
      setGenerationError(
        err.message || 'Failed to generate mini podcast. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick sync: Make Host 2 match Host 1 language
  const handleSyncHostLanguages = () => {
    setHost2LangCode(host1LangCode);
  };

  // Swap Host 1 and Host 2 languages
  const handleSwapHostLanguages = () => {
    const temp = host1LangCode;
    setHost1LangCode(host2LangCode);
    setHost2LangCode(temp);
  };

  // 3. Play a specific dialogue line via SpeechSynthesis with independent speaker locale
  const speakLine = useCallback(
    (index: number) => {
      if (
        !podcast ||
        !podcast.dialogue ||
        index < 0 ||
        index >= podcast.dialogue.length
      ) {
        setIsPlaying(false);
        return;
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      // Stop any current utterance
      window.speechSynthesis.cancel();

      const line = podcast.dialogue[index];
      const utterance = new SpeechSynthesisUtterance(line.text);
      activeUtteranceRef.current = utterance;

      // Rate / Speed
      utterance.rate = speedRef.current;

      const isHost1 = line.speaker === 'Host 1';

      // Determine the speaker's target locale code
      const speakerLocale =
        line.languageCode ||
        (isHost1
          ? podcast.host1LanguageCode || host1LangCode
          : podcast.host2LanguageCode || host2LangCode) ||
        'en-US';

      utterance.lang = speakerLocale;

      // Voice & Pitch assignment based on speaker
      if (isHost1) {
        utterance.pitch = host1Pitch;
        if (host1VoiceURI) {
          const v = voices.find((voice) => voice.voiceURI === host1VoiceURI);
          if (v) utterance.voice = v;
        }
      } else {
        utterance.pitch = host2Pitch;
        if (host2VoiceURI) {
          const v = voices.find((voice) => voice.voiceURI === host2VoiceURI);
          if (v) utterance.voice = v;
        }
      }

      // If assigned voice does not match speakerLocale, attempt dynamic fallback
      if (!utterance.voice && voices.length > 0) {
        const langPrefix = speakerLocale.split('-')[0].toLowerCase();
        const matched = voices.find((v) => {
          const vLang = v.lang.toLowerCase().replace('_', '-');
          return vLang === speakerLocale.toLowerCase() || vLang.startsWith(langPrefix);
        });
        if (matched) {
          utterance.voice = matched;
        }
      }

      utterance.onend = () => {
        if (!isPlayingRef.current) return;

        // Auto-advance to next line if still playing
        if (index + 1 < podcast.dialogue.length) {
          setCurrentLineIndex(index + 1);
          setTimeout(() => {
            if (isPlayingRef.current) {
              speakLine(index + 1);
            }
          }, 350);
        } else {
          // Reached end of episode
          setIsPlaying(false);
          setCurrentLineIndex(0);
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('SpeechSynthesis error:', e);
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [
      podcast,
      voices,
      host1VoiceURI,
      host2VoiceURI,
      host1Pitch,
      host2Pitch,
      host1LangCode,
      host2LangCode,
    ]
  );

  // 4. Play / Pause Control
  const handleTogglePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      setIsPlaying(false);
      window.speechSynthesis.cancel();
    } else {
      setIsPlaying(true);
      speakLine(currentLineIndex);
    }
  };

  const handlePlayFromLine = (index: number) => {
    setCurrentLineIndex(index);
    setIsPlaying(true);
    speakLine(index);
  };

  const handleNextLine = () => {
    if (!podcast?.dialogue) return;
    const nextIdx = Math.min(podcast.dialogue.length - 1, currentLineIndex + 1);
    setCurrentLineIndex(nextIdx);
    if (isPlaying) {
      speakLine(nextIdx);
    }
  };

  const handlePrevLine = () => {
    const prevIdx = Math.max(0, currentLineIndex - 1);
    setCurrentLineIndex(prevIdx);
    if (isPlaying) {
      speakLine(prevIdx);
    }
  };

  const handleRestart = () => {
    setCurrentLineIndex(0);
    if (isPlaying) {
      speakLine(0);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      speakLine(currentLineIndex);
    }
  };

  // 5. Scroll active line into view smoothly
  useEffect(() => {
    if (autoScroll && lineRefs.current[currentLineIndex]) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex, autoScroll]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 6. Copy and Download Transcript
  const handleCopyTranscript = () => {
    if (!podcast) return;
    const transcriptText = podcast.dialogue
      .map(
        (l) =>
          `${l.speakerName || l.speaker} [${l.language || (l.speaker === 'Host 1' ? podcast.host1Language : podcast.host2Language) || 'Speech'}]: ${l.text}`
      )
      .join('\n\n');

    const fullText = `# ${podcast.episodeTitle}\n${podcast.episodeTagline}\nHost 1: ${podcast.host1Language || 'English'} (${podcast.host1LanguageCode || 'en-US'})\nHost 2: ${podcast.host2Language || 'English'} (${podcast.host2LanguageCode || 'en-US'})\n\nKey Takeaways:\n${podcast.keyTakeaways.map((t) => `- ${t}`).join('\n')}\n\n---\n\n${transcriptText}`;

    navigator.clipboard.writeText(fullText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadTranscript = () => {
    if (!podcast) return;
    const transcriptText = podcast.dialogue
      .map(
        (l) =>
          `${l.speakerName || l.speaker} (${l.language || (l.speaker === 'Host 1' ? podcast.host1Language : podcast.host2Language) || 'Audio'}):\n"${l.text}"\n`
      )
      .join('\n');

    const fullText = `PODCAST EPISODE: ${podcast.episodeTitle}\nTAGLINE: ${podcast.episodeTagline}\nHOST 1 LANGUAGE: ${podcast.host1Language || 'English'} (${podcast.host1LanguageCode || 'en-US'})\nHOST 2 LANGUAGE: ${podcast.host2Language || 'English'} (${podcast.host2LanguageCode || 'en-US'})\nDURATION: ~${podcast.durationEstimate}\n\nKEY TAKEAWAYS:\n${podcast.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n====================\nFULL TRANSCRIPT:\n====================\n\n${transcriptText}`;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${studySet.title.replace(/\s+/g, '_')}_Podcast_Transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate estimated progress
  const totalLines = podcast?.dialogue?.length || 0;
  const progressPercent =
    totalLines > 0 ? Math.round(((currentLineIndex + 1) / totalLines) * 100) : 0;
  const activeLine = podcast?.dialogue?.[currentLineIndex];

  // Generation Steps labels
  const steps = [
    `Synthesizing key insights for Host 1 (${host1LangObj.nativeName}) & Host 2 (${host2LangObj.nativeName})...`,
    'Generating natural dual-host conversational dialogue and banter...',
    'Configuring SpeechSynthesis locales and phonetic prosody...',
    'Polishing interactive multilingual transcript...',
  ];

  // If no podcast has been generated yet for this study set
  if (!podcast) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-xl shadow-indigo-600/30 text-white mx-auto">
            <Radio className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Independent Multilingual Podcast Studio</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Turn Your Notes into a 5-Minute Mini Podcast
            </h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              Listen to an energetic, conversational recap between Host 1 (Alex) and Host 2 (Sam).
              Select languages independently for each host from all 22 official Indian languages and major global languages.
            </p>
          </div>

          {/* Dual Language Selection Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-indigo-500/30 text-left space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <Languages className="w-4 h-4 text-indigo-400" />
                <span>Configure Host Languages (Independent)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncHostLanguages}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300 hover:text-white transition cursor-pointer"
                  title="Set Host 2 to match Host 1 language"
                >
                  Match Languages
                </button>
                <button
                  type="button"
                  onClick={handleSwapHostLanguages}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Swap Host 1 and Host 2 languages"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Side-by-Side Dual Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Host 1 Selector */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-extrabold">
                    H1
                  </div>
                  <span>Host 1 (Alex)</span>
                </div>
                <SearchableLanguageSelect
                  id="host1-lang-select-init"
                  label="Language for Host 1"
                  hostName="Alex"
                  hostRole="Curious Explorer"
                  selectedCode={host1LangCode}
                  onChange={(lang) => setHost1LangCode(lang.code)}
                  accentColor="indigo"
                  disabled={isGenerating}
                />
              </div>

              {/* Host 2 Selector */}
              <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-300">
                  <div className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-extrabold">
                    H2
                  </div>
                  <span>Host 2 (Sam)</span>
                </div>
                <SearchableLanguageSelect
                  id="host2-lang-select-init"
                  label="Language for Host 2"
                  hostName="Sam"
                  hostRole="Analytical SME"
                  selectedCode={host2LangCode}
                  onChange={(lang) => setHost2LangCode(lang.code)}
                  accentColor="violet"
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* Language Summary Banner */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Host 1: <strong className="text-white">{host1LangObj.nativeName}</strong> ({host1LangObj.code}) • Host 2: <strong className="text-white">{host2LangObj.nativeName}</strong> ({host2LangObj.code})
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {host1LangCode === host2LangCode ? 'Unilingual' : 'Bilingual Episode'}
              </span>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-1">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                <Mic className="w-4 h-4" />
                <span>22 Indian Languages</span>
              </div>
              <p className="text-[12px] text-slate-400">
                Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi & more.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs">
                <Globe className="w-4 h-4" />
                <span>Major Global Languages</span>
              </div>
              <p className="text-[12px] text-slate-400">
                English, Spanish, French, German, Japanese, Korean, Arabic, Russian, Portuguese & more.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Sliders className="w-4 h-4" />
                <span>Independent TTS</span>
              </div>
              <p className="text-[12px] text-slate-400">
                Each host speaks in their chosen language with custom pitch and calibrated voices.
              </p>
            </div>
          </div>

          {generationError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Generation Notice:</strong>
                <span>{generationError}</span>
              </div>
            </div>
          )}

          {/* Call to action button */}
          <div className="pt-2">
            <button
              onClick={() => handleGeneratePodcast()}
              disabled={isGenerating}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-3 mx-auto"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Generating Episode ({host1LangObj.name} + {host2LangObj.name})...</span>
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  <span>
                    Generate 5-Min Podcast (H1: {host1LangObj.name} • H2: {host2LangObj.name})
                  </span>
                </>
              )}
            </button>
          </div>

          {isGenerating && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-indigo-300">
                <span className="font-semibold">{steps[generationStep]}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Step {generationStep + 1} of 4
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${((generationStep + 1) / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* 1. Podcast Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mini Podcast Episode</span>
              </span>

              {/* Host 1 Language Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                <span>{host1LangObj.flag || '🌐'}</span>
                <span>H1: {podcast.host1Language || host1LangObj.name}</span>
              </span>

              {/* Host 2 Language Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-xs font-semibold border border-violet-500/30">
                <span>{host2LangObj.flag || '🌐'}</span>
                <span>H2: {podcast.host2Language || host2LangObj.name}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{podcast.durationEstimate || '5 min'}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                <Headphones className="w-3 h-3 text-violet-400" />
                <span>{podcast.dialogue.length} Turns</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
              {podcast.episodeTitle}
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              {podcast.episodeTagline}
            </p>

            {/* Host Profiles */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                  H1
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-indigo-200">
                    Host 1 (Alex) • {podcast.host1Language || host1LangObj.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Curious Host & Analogies</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-950/40 border border-violet-500/20">
                <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center">
                  H2
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-violet-200">
                    Host 2 (Sam) • {podcast.host2Language || host2LangObj.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Analytical Co-Host & Deep Dive</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleTogglePlay}
                className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2.5"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause Episode</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>{currentLineIndex === 0 ? 'Play Episode' : 'Resume'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Languages & Voice Settings"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              <button
                onClick={handleCopyTranscript}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                title="Copy Full Transcript"
              >
                {copiedScript ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleDownloadTranscript}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                title="Download Transcript Text"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleGeneratePodcast(host1LangCode, host2LangCode)}
                disabled={isGenerating}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
                title="Regenerate Episode"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Independent Language Customization & Regenerate Notice */}
        <div className="mt-5 pt-5 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-indigo-400" />
              <span>Independent Host Language Selectors:</span>
            </span>

            {isDifferentLangSelected && (
              <button
                onClick={() => handleGeneratePodcast(host1LangCode, host2LangCode)}
                disabled={isGenerating}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Regenerate Episode in New Languages ➔</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchableLanguageSelect
              id="host1-lang-header-select"
              label="Host 1 Language"
              hostName="Alex"
              selectedCode={host1LangCode}
              onChange={(lang) => setHost1LangCode(lang.code)}
              accentColor="indigo"
              disabled={isGenerating}
            />

            <SearchableLanguageSelect
              id="host2-lang-header-select"
              label="Host 2 Language"
              hostName="Sam"
              selectedCode={host2LangCode}
              onChange={(lang) => setHost2LangCode(lang.code)}
              accentColor="violet"
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* Voice Settings Drawer */}
        {showVoiceSettings && (
          <div className="mt-5 pt-5 border-t border-slate-800 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Settings2 className="w-4 h-4 text-indigo-400" />
                <span>Speech Synthesis & Voice Customization</span>
              </div>
              <button
                onClick={() => setShowVoiceSettings(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Host 1 Voice Setting */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between font-semibold text-indigo-300">
                  <span className="flex items-center gap-1.5">
                    <span>Host 1 (Alex) Voice</span>
                    <span className="text-[10px] text-slate-400">[{host1LangObj.nativeName}]</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Pitch: {host1Pitch.toFixed(2)}
                  </span>
                </div>
                {voices.length > 0 ? (
                  <select
                    value={host1VoiceURI}
                    onChange={(e) => setHost1VoiceURI(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {voices.map((v) => (
                      <option key={`h1_${v.voiceURI}`} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-slate-400 text-[11px]">
                    Using default system voice ({host1LangCode})
                  </p>
                )}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Voice Pitch
                  </label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.05"
                    value={host1Pitch}
                    onChange={(e) => setHost1Pitch(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              {/* Host 2 Voice Setting */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-violet-500/20 space-y-2">
                <div className="flex items-center justify-between font-semibold text-violet-300">
                  <span className="flex items-center gap-1.5">
                    <span>Host 2 (Sam) Voice</span>
                    <span className="text-[10px] text-slate-400">[{host2LangObj.nativeName}]</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Pitch: {host2Pitch.toFixed(2)}
                  </span>
                </div>
                {voices.length > 0 ? (
                  <select
                    value={host2VoiceURI}
                    onChange={(e) => setHost2VoiceURI(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  >
                    {voices.map((v) => (
                      <option key={`h2_${v.voiceURI}`} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-slate-400 text-[11px]">
                    Using default system voice ({host2LangCode})
                  </p>
                )}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Voice Pitch
                  </label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.4"
                    step="0.05"
                    value={host2Pitch}
                    onChange={(e) => setHost2Pitch(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Key Takeaways Card */}
      {podcast.keyTakeaways && podcast.keyTakeaways.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Episode Takeaways & Big Ideas</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {podcast.keyTakeaways.map((takeaway, idx) => (
              <div
                key={`takeaway_${idx}`}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  {idx + 1}
                </div>
                <span>{takeaway}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Full Formatted Dialogue Transcript */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-extrabold text-slate-200">
              Interactive Dialogue Transcript
            </h3>
            <span className="text-xs text-slate-400 hidden sm:inline">
              (Click any line to listen)
            </span>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Auto-scroll</span>
          </label>
        </div>

        <div className="space-y-3.5">
          {podcast.dialogue.map((line, index) => {
            const isCurrent = index === currentLineIndex;
            const isHost1 = line.speaker === 'Host 1';
            const speakerLanguage =
              line.language ||
              (isHost1 ? podcast.host1Language || host1LangObj.name : podcast.host2Language || host2LangObj.name);

            return (
              <div
                key={line.id || `line_${index}`}
                ref={(el) => {
                  lineRefs.current[index] = el;
                }}
                onClick={() => handlePlayFromLine(index)}
                className={`group p-4 sm:p-5 rounded-2xl transition-all duration-300 cursor-pointer border relative ${
                  isCurrent
                    ? isHost1
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/50 scale-[1.01]'
                      : 'bg-violet-950/40 border-violet-500 shadow-lg shadow-violet-950/50 scale-[1.01]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Active Line Glow Indicator */}
                {isCurrent && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                      isHost1 ? 'bg-indigo-500' : 'bg-violet-500'
                    }`}
                  />
                )}

                <div className="flex items-start gap-3.5">
                  {/* Speaker Avatar / Badge */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-md ${
                      isHost1
                        ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white'
                        : 'bg-gradient-to-tr from-violet-600 to-purple-500 text-white'
                    }`}
                  >
                    {isHost1 ? 'H1' : 'H2'}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold ${
                            isHost1 ? 'text-indigo-300' : 'text-violet-300'
                          }`}
                        >
                          {line.speakerName || line.speaker}
                        </span>

                        {speakerLanguage && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              isHost1
                                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                            }`}
                          >
                            {speakerLanguage}
                          </span>
                        )}

                        {line.tone && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium border border-slate-700 capitalize">
                            {line.tone}
                          </span>
                        )}

                        {line.keyPoint && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                            {line.keyPoint}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent && isPlaying && (
                          <div className="flex items-center gap-1">
                            <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-4 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-2 bg-indigo-400 rounded-full animate-bounce" />
                          </div>
                        )}

                        <span className="text-[11px] font-mono text-slate-400">
                          #{index + 1}
                        </span>
                      </div>
                    </div>

                    <p
                      className={`text-sm sm:text-base leading-relaxed ${
                        isCurrent
                          ? 'text-slate-100 font-medium'
                          : 'text-slate-300'
                      }`}
                    >
                      {line.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Sticky Audio Control Bar (Bottom Floating) */}
      <div className="fixed bottom-5 left-4 right-4 max-w-4xl mx-auto z-40">
        <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-700/80 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/80 space-y-3.5">
          {/* Top Row: Speaker Info & Speed Selection */}
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                  isPlaying
                    ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50'
                    : 'bg-slate-500'
                }`}
              />
              <span className="font-bold text-slate-200 truncate">
                {activeLine
                  ? `${activeLine.speakerName || activeLine.speaker}: ${activeLine.text.slice(0, 45)}...`
                  : podcast.episodeTitle}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 shrink-0 font-mono">
                {activeLine?.speaker === 'Host 2' ? host2LangCode : host1LangCode}
              </span>
            </div>

            {/* Playback Speed Controls */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              {[1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
                <button
                  key={`speed_${speed}`}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2.5 py-1 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                    playbackSpeed === speed
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Middle Row: Scrubbable Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>
                Turn {currentLineIndex + 1} of {totalLines}
              </span>
              <span>{progressPercent}% Complete</span>
            </div>

            <div className="relative flex items-center group">
              <input
                type="range"
                min="0"
                max={Math.max(0, totalLines - 1)}
                value={currentLineIndex}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  setCurrentLineIndex(idx);
                  if (isPlaying) speakLine(idx);
                }}
                className="w-full h-2.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500 focus:outline-none shadow-inner"
              />
            </div>
          </div>

          {/* Bottom Row: Audio Playback Controls */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestart}
                className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm"
                title="Restart from beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrevLine}
                disabled={currentLineIndex <= 0}
                className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:hover:translate-y-0 cursor-pointer shadow-sm"
                title="Previous dialogue line"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            </div>

            {/* Central Play/Pause Button */}
            <button
              onClick={handleTogglePlay}
              className="px-7 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:translate-y-0 hover:-translate-y-0.5 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center gap-2.5 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause Episode</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {currentLineIndex === 0 ? 'Play Podcast' : 'Resume'}
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNextLine}
                disabled={currentLineIndex >= totalLines - 1}
                className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:hover:translate-y-0 cursor-pointer shadow-sm"
                title="Next dialogue line"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm"
                title="Audio Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
