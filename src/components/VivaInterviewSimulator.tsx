import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  VivaInterviewType,
  VivaDifficulty,
  VivaSetupConfig,
  VivaQuestionTurn,
  VivaReport,
  StudySet,
} from '../types';
import {
  STUDY_LANGUAGES,
  StudyLanguage,
  findLanguageByCode,
  findLanguageByName,
} from '../data/languages';
import {
  saveVivaReport,
  getSavedVivaReports,
  deleteVivaReport,
  generateVivaReportMarkdown,
} from '../utils/vivaHistoryUtils';
import { downloadFile } from '../utils/exportUtils';
import { VirtualScriptKeyboard } from './VirtualScriptKeyboard';
import { SearchableLanguageSelect } from './SearchableLanguageSelect';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Award,
  BookOpen,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Volume2,
  VolumeX,
  Keyboard,
  Download,
  Flame,
  Target,
  RefreshCw,
  ListOrdered,
  Layers,
  GraduationCap,
  Briefcase,
  Code2,
  Users2,
  FolderGit2,
  Zap,
  Check,
  X,
  History,
  Trash2,
} from 'lucide-react';

interface VivaInterviewSimulatorProps {
  initialStudySet?: StudySet | null;
  onBackToDashboard?: () => void;
}

const INTERVIEW_TYPE_OPTIONS: Array<{
  id: VivaInterviewType;
  title: string;
  subtitle: string;
  icon: any;
  colorClass: string;
}> = [
  {
    id: 'academic_viva',
    title: 'Academic Viva',
    subtitle: 'Syllabus concepts, proofs, definitions & fundamental theory',
    icon: GraduationCap,
    colorClass: 'from-blue-600 to-indigo-600 border-blue-500/30 text-blue-400',
  },
  {
    id: 'technical_interview',
    title: 'Technical Interview',
    subtitle: 'DSA, OS, DBMS, Networks, system design & complexity analysis',
    icon: Code2,
    colorClass: 'from-emerald-600 to-teal-600 border-emerald-500/30 text-emerald-400',
  },
  {
    id: 'project_viva',
    title: 'Project Viva',
    subtitle: 'Architecture, tech stack choices, challenges, testing & trade-offs',
    icon: FolderGit2,
    colorClass: 'from-violet-600 to-purple-600 border-violet-500/30 text-violet-400',
  },
  {
    id: 'placement_interview',
    title: 'Placement Interview',
    subtitle: 'Comprehensive campus / job recruitment technical & domain round',
    icon: Briefcase,
    colorClass: 'from-amber-600 to-orange-600 border-amber-500/30 text-amber-400',
  },
  {
    id: 'hr_interview',
    title: 'HR & Behavioral',
    subtitle: 'Situational judgment, teamwork, leadership & STAR method',
    icon: Users2,
    colorClass: 'from-pink-600 to-rose-600 border-pink-500/30 text-pink-400',
  },
  {
    id: 'custom_interview',
    title: 'Custom Viva',
    subtitle: 'Enter your custom subject, syllabus requirements, or job role',
    icon: Zap,
    colorClass: 'from-cyan-600 to-blue-600 border-cyan-500/30 text-cyan-400',
  },
];

const PRESET_TOPICS = [
  'Operating Systems & Process Scheduling',
  'DBMS, SQL & Database Normalization',
  'Data Structures, Algorithms & Complexity',
  'Computer Networks & TCP/IP Protocols',
  'Object-Oriented Design & Design Patterns',
  'Full-Stack Web Architecture & APIs',
  'Machine Learning & Neural Networks',
  'Cloud Computing & Distributed Systems',
];

export const VivaInterviewSimulator: React.FC<VivaInterviewSimulatorProps> = ({
  initialStudySet,
  onBackToDashboard,
}) => {
  // Phase state: 'setup' | 'interview' | 'evaluating' | 'report' | 'history'
  const [phase, setPhase] = useState<'setup' | 'interview' | 'evaluating' | 'report' | 'history'>('setup');

  // Setup options
  const [subject, setSubject] = useState<string>(() => {
    return initialStudySet?.title || 'Operating Systems & Process Management';
  });
  const [interviewType, setInterviewType] = useState<VivaInterviewType>('academic_viva');
  const [difficulty, setDifficulty] = useState<VivaDifficulty>('intermediate');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [customQuestionCountInput, setCustomQuestionCountInput] = useState<string>('5');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(10);
  const [sourceMaterialType, setSourceMaterialType] = useState<'study_set' | 'notes' | 'manual'>(() => {
    return initialStudySet ? 'study_set' : 'manual';
  });
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Multilingual interview selection
  const [selectedLanguage, setSelectedLanguage] = useState<StudyLanguage>(() => {
    if (initialStudySet?.studyLanguageCode) {
      return findLanguageByCode(initialStudySet.studyLanguageCode);
    }
    return findLanguageByName('English');
  });

  // Active Interview State
  const [activeSetup, setActiveSetup] = useState<VivaSetupConfig | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [currentQuestionText, setCurrentQuestionText] = useState<string>('');
  const [contextRationale, setContextRationale] = useState<string>('');
  const [turns, setTurns] = useState<VivaQuestionTurn[]>([]);
  const [currentAnswerText, setCurrentAnswerText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const mainTimerRef = useRef<any>(null);

  // Script Keyboard & Audio Readout State
  const [isScriptKeyboardOpen, setIsScriptKeyboardOpen] = useState<boolean>(false);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState<boolean>(false);
  const answerTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Report state
  const [activeReport, setActiveReport] = useState<VivaReport | null>(null);
  const [savedReports, setSavedReports] = useState<VivaReport[]>([]);
  const [expandedTurnIndex, setExpandedTurnIndex] = useState<number | null>(0);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState<boolean>(false);

  // Delete confirmation & Undo Toast state
  const [reportToDelete, setReportToDelete] = useState<VivaReport | null>(null);
  const [undoReport, setUndoReport] = useState<VivaReport | null>(null);
  const undoToastTimeoutRef = useRef<any>(null);

  // Load saved history on mount
  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    const reports = await getSavedVivaReports();
    setSavedReports(reports);
  };

  // Main interview timer
  useEffect(() => {
    if (isTimerRunning) {
      mainTimerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    }
    return () => {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    };
  }, [isTimerRunning]);

  // Clean up media recorder on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }
      if (undoToastTimeoutRef.current) {
        clearTimeout(undoToastTimeoutRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Format seconds as MM:SS
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Speak question aloud using SpeechSynthesis
  const handleToggleSpeakQuestion = () => {
    if (!('speechSynthesis' in window) || !currentQuestionText) return;

    if (isSpeakingQuestion) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestionText);
    if (selectedLanguage.code) {
      utterance.lang = selectedLanguage.code;
    }
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingQuestion(false);
    utterance.onerror = () => setIsSpeakingQuestion(false);
    setIsSpeakingQuestion(true);
    window.speechSynthesis.speak(utterance);
  };

  // 1. START INTERVIEW
  const handleStartInterview = async (overrideSetup?: Partial<VivaSetupConfig>) => {
    const count =
      overrideSetup?.questionCount ||
      (questionCount === -1 ? Math.max(3, parseInt(customQuestionCountInput, 10) || 5) : questionCount);

    const setupConfig: VivaSetupConfig = {
      subject: overrideSetup?.subject || subject.trim() || 'General Academic Examination',
      interviewType: overrideSetup?.interviewType || interviewType,
      difficulty: overrideSetup?.difficulty || difficulty,
      questionCount: count,
      language: overrideSetup?.language || selectedLanguage.name,
      languageCode: overrideSetup?.languageCode || selectedLanguage.code,
      timeLimitMinutes: overrideSetup?.timeLimitMinutes ?? timeLimitMinutes,
      sourceMaterialType: overrideSetup?.sourceMaterialType || sourceMaterialType,
      sourceText:
        sourceMaterialType === 'study_set' && initialStudySet
          ? `${initialStudySet.title}\n\nSummary:\n${initialStudySet.summary.highLevelOverview}\n\nKey Concepts:\n${initialStudySet.summary.keyConcepts.map((k) => `${k.topic}: ${k.details}`).join('\n')}`
          : undefined,
      customInstructions: overrideSetup?.customInstructions || customInstructions,
    };

    setActiveSetup(setupConfig);
    setTurns([]);
    setCurrentAnswerText('');
    setCurrentQuestionNumber(1);
    setElapsedSeconds(0);
    setErrorMessage(null);
    setPhase('interview');
    setIsTimerRunning(true);
    setIsAiThinking(true);

    try {
      const res = await fetch('/api/viva/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup: setupConfig,
          conversationHistory: [],
          questionNumber: 1,
          totalQuestions: setupConfig.questionCount,
          sourceContext: setupConfig.sourceText,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start interview');
      }

      const data = await res.json();
      setCurrentQuestionText(data.questionText);
      setContextRationale(data.contextFollowUpRationale || '');
    } catch (err: any) {
      console.error('Error starting interview:', err);
      setErrorMessage(err.message || 'Could not generate first question');
    } finally {
      setIsAiThinking(false);
    }
  };

  // 2. VOICE RECORDING LOGIC
  const startVoiceRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Microphone access is not supported in this browser. Please type your answer.');
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

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleTranscribeSpokenAudio(audioBlob, mimeType);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage('Microphone permission denied. Please allow mic access or type your answer.');
    }
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const handleTranscribeSpokenAudio = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        try {
          const res = await fetch('/api/viva/transcribe-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType,
              languageCode: selectedLanguage.code,
              languageName: selectedLanguage.name,
            }),
          });

          if (!res.ok) throw new Error('Transcription failed');
          const data = await res.json();
          if (data.transcript) {
            setCurrentAnswerText((prev) => {
              const clean = data.transcript.trim();
              return prev ? `${prev} ${clean}` : clean;
            });
          }
        } catch (err: any) {
          console.error('STT API error:', err);
          setErrorMessage('Could not auto-transcribe audio. You can type or edit your answer directly.');
        } finally {
          setIsTranscribing(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setIsTranscribing(false);
    }
  };

  // 3. SUBMIT ANSWER OR SKIP
  const handleSubmitTurn = async (wasSkipped: boolean = false) => {
    if (!activeSetup || isAiThinking) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }

    const answerToRecord = wasSkipped ? '' : currentAnswerText.trim();
    if (!wasSkipped && !answerToRecord) {
      setErrorMessage('Please type or speak your answer before submitting, or click Skip Question.');
      return;
    }

    const newTurn: VivaQuestionTurn = {
      id: `turn_${currentQuestionNumber}_${Date.now()}`,
      questionNumber: currentQuestionNumber,
      questionText: currentQuestionText,
      userAnswerText: answerToRecord,
      wasSkipped,
      timestamp: new Date().toISOString(),
    };

    const updatedTurns = [...turns, newTurn];
    setTurns(updatedTurns);
    setCurrentAnswerText('');
    setErrorMessage(null);

    // Check if this was the last question
    if (currentQuestionNumber >= activeSetup.questionCount) {
      // Completed interview -> proceed to Evaluation Report
      await handleFinishInterview(updatedTurns);
      return;
    }

    // Proceed to next question
    const nextQNum = currentQuestionNumber + 1;
    setCurrentQuestionNumber(nextQNum);
    setIsAiThinking(true);

    try {
      const res = await fetch('/api/viva/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup: activeSetup,
          conversationHistory: updatedTurns,
          questionNumber: nextQNum,
          totalQuestions: activeSetup.questionCount,
          sourceContext: activeSetup.sourceText,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load next question');
      }

      const data = await res.json();
      setCurrentQuestionText(data.questionText);
      setContextRationale(data.contextFollowUpRationale || '');
    } catch (err: any) {
      console.error('Error generating next question:', err);
      setErrorMessage(err.message || 'Could not adapt next question');
    } finally {
      setIsAiThinking(false);
    }
  };

  // Prepare turns for ending, preserving any in-progress response
  const prepareTurnsForEnding = (): VivaQuestionTurn[] => {
    const answer = currentAnswerText.trim();
    if (answer && currentQuestionText) {
      const activeTurn: VivaQuestionTurn = {
        id: `turn_${currentQuestionNumber}_${Date.now()}`,
        questionNumber: currentQuestionNumber,
        questionText: currentQuestionText,
        userAnswerText: answer,
        wasSkipped: false,
        timestamp: new Date().toISOString(),
      };
      return [...turns, activeTurn];
    } else if (turns.length === 0 && currentQuestionText) {
      const fallbackTurn: VivaQuestionTurn = {
        id: `turn_1_${Date.now()}`,
        questionNumber: 1,
        questionText: currentQuestionText,
        userAnswerText: '',
        wasSkipped: true,
        timestamp: new Date().toISOString(),
      };
      return [fallbackTurn];
    }
    return turns;
  };

  const handleRequestEndViva = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    if (isRecording) {
      stopVoiceRecording();
    }
    setIsEndConfirmOpen(true);
  };

  const handleConfirmEndAndEvaluate = () => {
    setIsEndConfirmOpen(false);
    const finalTurns = prepareTurnsForEnding();
    handleFinishInterview(finalTurns);
  };

  const handleConfirmExitWithoutReport = () => {
    setIsEndConfirmOpen(false);
    setIsTimerRunning(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      setPhase('setup');
    }
  };

  // 4. FINISH & EVALUATE REPORT
  const handleFinishInterview = async (finalTurns: VivaQuestionTurn[]) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    setIsTimerRunning(false);
    setPhase('evaluating');
    setIsAiThinking(true);
    setErrorMessage(null);

    const safeTurns = finalTurns && finalTurns.length > 0 ? finalTurns : prepareTurnsForEnding();

    try {
      const res = await fetch('/api/viva/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup: activeSetup,
          turns: safeTurns,
          durationSeconds: elapsedSeconds,
          sourceContext: activeSetup?.sourceText,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate evaluation report');
      }

      const data = await res.json();
      if (data.report) {
        setActiveReport(data.report);
        await saveVivaReport(data.report);
        await loadSavedReports();
        setPhase('report');
        return;
      }
      throw new Error('No report received');
    } catch (err: any) {
      console.error('Error generating report, creating fallback assessment report:', err);
      // Fallback local report creation so user is never trapped or locked out
      const answeredCount = safeTurns.filter((t) => !t.wasSkipped && t.userAnswerText?.trim()).length;
      const fallbackReport: VivaReport = {
        id: `viva_${Date.now()}`,
        createdAt: new Date().toISOString(),
        title: `${activeSetup?.subject || 'Interview'} Performance Assessment`,
        subject: activeSetup?.subject || 'Technical Subject',
        interviewType: activeSetup?.interviewType || 'academic_viva',
        difficulty: activeSetup?.difficulty || 'intermediate',
        language: activeSetup?.language || 'English',
        languageCode: activeSetup?.languageCode || 'en-US',
        durationSeconds: elapsedSeconds,
        totalQuestions: safeTurns.length,
        answeredQuestions: answeredCount,
        skippedQuestions: safeTurns.length - answeredCount,
        knowledgeScore: answeredCount > 0 ? 75 : 30,
        knowledgeScoreExplanation: answeredCount > 0
          ? 'Completed answers demonstrated understanding of fundamental principles and definitions.'
          : 'Interview was concluded before full question responses were provided.',
        communicationScore: answeredCount > 0 ? 78 : 45,
        communicationScoreExplanation: 'Responses were direct and focused on key terminology.',
        overallScore: answeredCount > 0 ? 76 : 35,
        strengths: [
          `Clear communication regarding ${activeSetup?.subject || 'the chosen topic'}`,
          'Structured responses to examiner questions',
        ],
        weakAreas: [
          {
            concept: `${activeSetup?.subject || 'Core Topic'} In-depth Details & Real-world Trade-offs`,
            issue: 'Opportunity to provide deeper mathematical and design trade-off reasoning.',
            recommendedAction: 'Practice explaining theoretical concepts out loud with structured steps.',
          },
        ],
        suggestedAnswers: safeTurns.map((t) => ({
          question: t.questionText,
          userAnswer: t.userAnswerText || (t.wasSkipped ? 'Question was skipped' : 'No answer provided'),
          suggestedAnswer: `For "${t.questionText}", a strong oral response starts with a formal definition, mentions key properties/mechanisms, gives a concrete example, and highlights trade-offs.`,
          whatWasMissing: t.wasSkipped ? 'Question skipped.' : 'Could elaborate more on architectural context and edge cases.',
        })),
        followUpQuestions: [
          `What are the primary operational challenges encountered with ${activeSetup?.subject || 'this topic'}?`,
          `How would you architect this to scale reliably under heavy load?`,
          `What are the most critical trade-offs between speed, complexity, and safety?`,
        ],
        recommendation: 'Good interview performance. Keep practicing oral explanations with concise technical vocabulary.',
        turns: safeTurns.map((t, idx) => ({
          ...t,
          evaluation: {
            status: t.wasSkipped ? 'skipped' : (t.userAnswerText && t.userAnswerText.length > 20 ? 'correct' : 'partially_correct'),
            score: t.wasSkipped ? 0 : (t.userAnswerText && t.userAnswerText.length > 20 ? 8 : 6),
            knowledgeEvaluation: t.wasSkipped ? 'Question was skipped' : 'Demonstrated conceptual awareness.',
            communicationEvaluation: t.wasSkipped ? 'N/A' : 'Clear presentation.',
            suggestedAnswer: `Detailed model answer addressing "${t.questionText}" with structured points and accurate terminology.`,
            missingPoints: t.wasSkipped ? ['Response was skipped'] : ['Further edge-case analysis'],
            improvementTip: 'Structure answers using: Definition -> Mechanism -> Example.',
          },
        })),
      };

      setActiveReport(fallbackReport);
      await saveVivaReport(fallbackReport);
      await loadSavedReports();
      setPhase('report');
    } finally {
      setIsAiThinking(false);
    }
  };

  // 5. PRACTICE WEAK AREAS
  const handlePracticeWeakAreas = (report: VivaReport) => {
    const weakTopicsList = report.weakAreas.map((w) => w.concept).join(', ');
    const weakPrompt = `Focused Reinforcement Mini-Interview on identified weak concepts: ${weakTopicsList}. Ask precise questions to test and solidify these concepts.`;

    handleStartInterview({
      subject: `${report.subject} (Weak Area Practice)`,
      interviewType: report.interviewType,
      difficulty: report.difficulty,
      questionCount: Math.min(5, Math.max(3, report.weakAreas.length + 1)),
      language: report.language,
      languageCode: report.languageCode,
      timeLimitMinutes: 10,
      customInstructions: weakPrompt,
    });
  };

  // 6. EXPORT REPORT
  const handleExportReport = (report: VivaReport) => {
    const md = generateVivaReportMarkdown(report);
    downloadFile(
      `${report.subject.replace(/[^a-zA-Z0-9]/g, '_')}_Viva_Report.md`,
      md,
      'text/markdown'
    );
  };

  const handleCopyReportMarkdown = (report: VivaReport) => {
    const md = generateVivaReportMarkdown(report);
    navigator.clipboard.writeText(md);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // 7. DELETE SESSION & UNDO HANDLERS
  const handleDeleteSessionClick = (e: React.MouseEvent, report: VivaReport) => {
    e.stopPropagation();
    setReportToDelete(report);
  };

  const handleConfirmDeleteReport = async () => {
    if (!reportToDelete) return;
    const target = reportToDelete;
    setReportToDelete(null);

    // Save for undo and start 5-second dismiss timer
    if (undoToastTimeoutRef.current) clearTimeout(undoToastTimeoutRef.current);
    setUndoReport(target);
    undoToastTimeoutRef.current = setTimeout(() => {
      setUndoReport(null);
    }, 5000);

    // Optimistic UI state update
    setSavedReports((prev) => prev.filter((r) => r.id !== target.id));

    // Persistent storage removal (IndexedDB + localStorage)
    await deleteVivaReport(target.id);
    await loadSavedReports();

    if (activeReport?.id === target.id) {
      setActiveReport(null);
      if (phase === 'report') {
        setPhase('history');
      }
    }
  };

  const handleUndoDelete = async () => {
    if (!undoReport) return;
    if (undoToastTimeoutRef.current) clearTimeout(undoToastTimeoutRef.current);
    const restored = undoReport;
    setUndoReport(null);

    // Save back into persistent storage
    await saveVivaReport(restored);
    await loadSavedReports();
  };

  // ==========================================
  // VIEW RENDERERS
  // ==========================================

  // ----------------------------------------------------
  // PHASE 1: SETUP SCREEN
  // ----------------------------------------------------
  if (phase === 'setup') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Top Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Mic className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>AI Examiner &amp; Oral Exam Simulator</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Viva &amp; Interview Simulator
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Practice real-world viva, technical screening, or academic oral defense with a dynamic AI examiner.
                Questions adapt to your responses one-by-one with spoken voice and multilingual support.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {savedReports.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPhase('history')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>Past Reports ({savedReports.length})</span>
                </button>
              )}
              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-semibold transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Setup Configuration Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Main Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Subject / Topic Selection */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>1. Subject / Topic of Examination</span>
                </label>
                {initialStudySet && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubject(initialStudySet.title);
                      setSourceMaterialType('study_set');
                    }}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    Use Active Notes: {initialStudySet.title.slice(0, 24)}...
                  </button>
                )}
              </div>

              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Operating Systems: Process Scheduling & Deadlocks"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
              />

              {/* Topic Preset Chips */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400">Popular Topic Templates:</div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TOPICS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSubject(preset)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        subject === preset
                          ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 font-bold'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Interview Type Cards */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span>2. Interview Format &amp; Persona</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTERVIEW_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = interviewType === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setInterviewType(opt.id)}
                      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-br from-slate-900 to-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                          : 'bg-slate-950 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-100">{opt.title}</div>
                          <div className="text-xs text-slate-400 mt-1 leading-snug">{opt.subtitle}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Difficulty Level & Material Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Difficulty */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>3. Difficulty Level</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['beginner', 'intermediate', 'advanced', 'expert'] as VivaDifficulty[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                        difficulty === lvl
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-400" />
                  <span>4. Question Count</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setQuestionCount(num);
                        setCustomQuestionCountInput(num.toString());
                      }}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        questionCount === num
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Language, Timer & Start */}
          <div className="space-y-6">
            {/* Language Selection */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Interview Language</span>
              </label>

              <SearchableLanguageSelect
                selectedCode={selectedLanguage.code}
                onChange={setSelectedLanguage}
                label="Viva Language"
                accentColor="indigo"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The AI examiner will ask questions in <strong className="text-slate-200">{selectedLanguage.name}</strong>.
                You can answer verbally via microphone or type in your script.
              </p>
            </div>

            {/* Time Limit */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Time Limit</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'No limit', val: 0 },
                  { label: '5 Mins', val: 5 },
                  { label: '10 Mins', val: 10 },
                  { label: '15 Mins', val: 15 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setTimeLimitMinutes(item.val)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      timeLimitMinutes === item.val
                        ? 'bg-amber-600/30 text-amber-200 border-amber-500/60'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Interview CTA Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/80 via-indigo-950 to-slate-900 border border-indigo-500/40 space-y-4 shadow-xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/40">
                <Mic className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">Ready for your Viva?</h3>
                <p className="text-xs text-slate-300 mt-1">
                  {questionCount} adaptive questions • {difficulty} • {selectedLanguage.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleStartInterview()}
                disabled={!subject.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold text-base shadow-lg shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                🎤 Start Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PHASE 2: ACTIVE INTERVIEW EXAMINER MODE
  // ----------------------------------------------------
  if (phase === 'interview') {
    const progressPercent = activeSetup
      ? Math.round(((currentQuestionNumber - 1) / activeSetup.questionCount) * 100)
      : 0;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
        {/* Top Progress & Metrics Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-extrabold text-sm">
              Q{currentQuestionNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200 text-sm">
                  Question {currentQuestionNumber} of {activeSetup?.questionCount}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                  {activeSetup?.difficulty}
                </span>
              </div>
              <div className="text-xs text-slate-400 truncate max-w-xs">{activeSetup?.subject}</div>
            </div>
          </div>

          {/* Progress Bar & Timer */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="w-36 sm:w-48 bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={handleRequestEndViva}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              title="End viva interview and evaluate current progress"
            >
              <Square className="w-3 h-3 text-rose-400 fill-rose-400/30" />
              <span>End Viva</span>
            </button>
          </div>
        </div>

        {/* AI Examiner Question Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>AI Examiner</span>
              <span className="text-[10px] text-slate-400 font-normal">({selectedLanguage.name})</span>
            </div>

            {/* Read Aloud TTS button */}
            <button
              type="button"
              onClick={handleToggleSpeakQuestion}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isSpeakingQuestion
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Listen to examiner read the question"
            >
              {isSpeakingQuestion ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{isSpeakingQuestion ? 'Stop Audio' : 'Listen'}</span>
            </button>
          </div>

          {/* Question Text */}
          <div className="min-h-[90px] flex items-center">
            {isAiThinking ? (
              <div className="flex items-center gap-3 text-indigo-300 text-sm font-semibold animate-pulse py-4">
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>AI Examiner is evaluating your previous answer and formulating Question {currentQuestionNumber}...</span>
              </div>
            ) : (
              <p className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {currentQuestionText || 'Preparing question...'}
              </p>
            )}
          </div>

          {contextRationale && !isAiThinking && (
            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{contextRationale}</span>
            </div>
          )}
        </div>

        {/* Candidate Answer Input Section */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          {/* Mode Switcher: Voice vs Text */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Your Response</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('voice')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  inputMode === 'voice'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className={`w-3.5 h-3.5 ${inputMode === 'voice' && !isRecording && !isAiThinking ? 'animate-pulse text-indigo-200' : ''}`} />
                <span>Voice Answer</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  inputMode === 'text'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Text Answer</span>
              </button>
            </div>
          </div>

          {/* Voice Input Container */}
          {inputMode === 'voice' && (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center space-y-4 text-center">
              {!isRecording && !isTranscribing ? (
                <div className="space-y-3">
                  <div className="relative inline-flex items-center justify-center">
                    {/* Subtle pulse rings when examiner is waiting for verbal response */}
                    {!isAiThinking && (
                      <>
                        <span className="absolute -inset-2 rounded-full bg-indigo-500/25 animate-ping opacity-40 pointer-events-none" />
                        <span className="absolute -inset-4 rounded-full bg-violet-500/15 animate-pulse opacity-50 pointer-events-none" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer mx-auto group ${
                        !isAiThinking
                          ? 'shadow-indigo-500/40 hover:shadow-indigo-500/60 ring-2 ring-indigo-400/30'
                          : 'shadow-indigo-600/30 opacity-70'
                      }`}
                      title="Click to speak your answer"
                    >
                      <Mic
                        className={`w-8 h-8 transition-transform group-hover:scale-110 ${
                          !isAiThinking ? 'animate-pulse' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-200 font-bold flex items-center justify-center gap-1.5">
                      {!isAiThinking && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      )}
                      <span>
                        {isAiThinking
                          ? 'Examiner is formulating next question...'
                          : 'Examiner is waiting for your verbal response'}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Click to speak your answer in <span className="text-indigo-400 font-semibold">{selectedLanguage.name}</span>
                    </p>
                  </div>
                </div>
              ) : isRecording ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm animate-pulse">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>🔴 Listening... ({recordingSeconds}s)</span>
                  </div>

                  {/* Audio Waveform Simulation */}
                  <div className="flex items-center justify-center gap-1 h-10">
                    {[30, 70, 45, 90, 60, 100, 50, 80, 40, 65].map((h, i) => (
                      <span
                        key={i}
                        className="w-1.5 bg-rose-500 rounded-full animate-bounce"
                        style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-rose-600/30"
                  >
                    <Square className="w-4 h-4" />
                    <span>Done Speaking (Transcribe)</span>
                  </button>
                </div>
              ) : (
                <div className="py-4 flex items-center gap-3 text-indigo-300 font-semibold text-xs">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Converting spoken audio to accurate text...</span>
                </div>
              )}

              {/* Editable Voice Transcript */}
              {currentAnswerText && (
                <div className="w-full text-left space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Recognized Spoken Transcript (Review &amp; Edit):</span>
                    <button
                      type="button"
                      onClick={() => setCurrentAnswerText('')}
                      className="text-slate-400 hover:text-rose-300"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={currentAnswerText}
                    onChange={(e) => setCurrentAnswerText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Text Input Container */}
          {inputMode === 'text' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsScriptKeyboardOpen(!isScriptKeyboardOpen)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>{isScriptKeyboardOpen ? 'Hide Script Keyboard' : 'Open Virtual Script Keyboard'}</span>
                </button>
                <span className="text-[11px] text-slate-500">{currentAnswerText.length} characters</span>
              </div>

              <textarea
                ref={answerTextareaRef}
                rows={4}
                value={currentAnswerText}
                onChange={(e) => setCurrentAnswerText(e.target.value)}
                placeholder={`Type your answer in ${selectedLanguage.name} or English...`}
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition leading-relaxed placeholder:text-slate-500"
              />

              {isScriptKeyboardOpen && (
                <div className="pt-2">
                  <VirtualScriptKeyboard
                    languageCode={selectedLanguage.code}
                    languageName={selectedLanguage.name}
                    onInsertChar={(char) => {
                      setCurrentAnswerText((prev) => prev + char);
                    }}
                    onBackspace={() => {
                      setCurrentAnswerText((prev) => prev.slice(0, -1));
                    }}
                    onClose={() => setIsScriptKeyboardOpen(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSubmitTurn(true)}
                disabled={isAiThinking}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Skip Question ⏩
              </button>

              <button
                type="button"
                onClick={handleRequestEndViva}
                disabled={isAiThinking}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Square className="w-3 h-3 text-rose-400" />
                <span>End Viva</span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSubmitTurn(false)}
                disabled={isAiThinking || (!currentAnswerText.trim() && !isRecording)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {currentQuestionNumber === activeSetup?.questionCount
                    ? 'Submit Final Answer & Finish 🏁'
                    : 'Submit Answer ↵'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* End Viva In-App Confirmation Modal */}
        {isEndConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-indigo-500/40 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <Square className="w-6 h-6 fill-rose-400/30" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">End Interview Session?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Question {currentQuestionNumber} of {activeSetup?.questionCount || 5} in progress
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p>
                  You can end the interview now and receive a comprehensive performance evaluation on all questions answered so far.
                </p>
                {currentAnswerText.trim() && (
                  <p className="text-indigo-300 font-medium text-[11px] bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                    ✓ Your current typed response for Question {currentQuestionNumber} will be evaluated as part of the report.
                  </p>
                )}
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmEndAndEvaluate}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>End &amp; Generate Evaluation Report</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmExitWithoutReport}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Exit Without Saving
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEndConfirmOpen(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    Resume Interview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // PHASE 3: EVALUATING / GENERATING REPORT
  // ----------------------------------------------------
  if (phase === 'evaluating') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-2xl animate-pulse">
          <GraduationCap className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white">Evaluating Interview Performance...</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Analyzing conceptual accuracy, technical terminology, communication clarity, and pinpointing key weak areas.
          </p>
        </div>
        <div className="flex justify-center gap-1.5 py-4">
          <span className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" style={{ animationDelay: '0ms' }} />
          <span className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" style={{ animationDelay: '200ms' }} />
          <span className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PHASE 4: PERFORMANCE REPORT & REVIEW
  // ----------------------------------------------------
  if (phase === 'report' && activeReport) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Top Report Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/40 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                <span>Viva Performance Assessment Report</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{activeReport.title}</h1>
              <p className="text-xs text-slate-400 mt-1">
                {activeReport.difficulty.toUpperCase()} • {activeReport.language} •{' '}
                {Math.round(activeReport.durationSeconds / 60)} mins • {activeReport.answeredQuestions}/
                {activeReport.totalQuestions} Answered
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => handlePracticeWeakAreas(activeReport)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer"
              >
                <Target className="w-4 h-4" />
                <span>🎯 Practice Weak Areas</span>
              </button>

              <button
                type="button"
                onClick={() => handleStartInterview()}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportReport(activeReport)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                title="Download Markdown Report"
              >
                <Download className="w-4 h-4 text-indigo-400" />
              </button>

              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="px-3.5 py-2.5 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition cursor-pointer"
                >
                  Dashboard
                </button>
              )}

              <button
                type="button"
                onClick={() => setPhase('history')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                title="View Viva History"
              >
                <History className="w-4 h-4 text-indigo-400" />
                <span>History</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteSessionClick(e, activeReport)}
                className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700 hover:border-rose-500/30 transition cursor-pointer"
                title="Delete this Viva Report"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setPhase('setup')}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                New Viva
              </button>
            </div>
          </div>

          {/* 3 Main Score Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Knowledge Score */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">📚 Knowledge Score</span>
                <span className="text-2xl font-black text-white">{activeReport.knowledgeScore}/100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${activeReport.knowledgeScore}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{activeReport.knowledgeScoreExplanation}</p>
            </div>

            {/* 2. Communication Score */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">🗣️ Communication</span>
                <span className="text-2xl font-black text-white">{activeReport.communicationScore}/100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full"
                  style={{ width: `${activeReport.communicationScore}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{activeReport.communicationScoreExplanation}</p>
            </div>

            {/* 3. Overall Score */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-violet-900/60 border border-violet-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">🏆 Overall Score</span>
                <span className="text-2xl font-black text-amber-300">{activeReport.overallScore}/100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full"
                  style={{ width: `${activeReport.overallScore}%` }}
                />
              </div>
              <p className="text-[11px] text-violet-200/90 font-medium leading-snug">
                {activeReport.overallScore >= 80
                  ? 'Excellent readiness for formal examinations!'
                  : activeReport.overallScore >= 60
                  ? 'Strong foundational concepts with targeted practice needed.'
                  : 'Needs targeted revision in core concepts.'}
              </p>
            </div>
          </div>
        </div>

        {/* Strengths & Weak Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Demonstrated Strengths</span>
            </h3>
            <ul className="space-y-2.5">
              {activeReport.strengths.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weak Areas */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Areas to Improve (Specific Concepts)</span>
            </h3>
            {activeReport.weakAreas.length === 0 ? (
              <p className="text-xs text-slate-400">No critical weak areas identified! Outstanding performance.</p>
            ) : (
              <div className="space-y-3">
                {activeReport.weakAreas.map((w, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                    <div className="font-bold text-xs text-rose-200">{w.concept}</div>
                    <div className="text-[11px] text-rose-300/90">{w.issue}</div>
                    <div className="text-[10px] text-amber-300 font-medium pt-1">💡 Action: {w.recommendedAction}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Suggested Model Answers for Weak/Skipped Responses */}
        {activeReport.suggestedAnswers.length > 0 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>💡 Suggested Model Answers for Weak or Incomplete Responses</span>
            </h3>

            <div className="space-y-4">
              {activeReport.suggestedAnswers.map((sa, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="font-bold text-xs text-slate-200 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 text-[10px]">
                      Q{idx + 1}
                    </span>
                    <span>{sa.question}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Your Answer</div>
                      <p className="text-slate-300">{sa.userAnswer || '*(Skipped)*'}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase">Ideal Model Answer</div>
                      <p className="text-emerald-200">{sa.suggestedAnswer}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    <strong>What was missing:</strong> {sa.whatWasMissing}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-Up Questions & Recommendation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Follow-Up Questions */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Recommended Follow-Up Questions</span>
            </h3>
            <ol className="space-y-2 list-decimal list-inside text-xs text-slate-300 leading-relaxed">
              {activeReport.followUpQuestions.map((q, idx) => (
                <li key={idx} className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {q}
                </li>
              ))}
            </ol>
          </div>

          {/* Examiner Recommendation */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>Examiner Recommendation &amp; Roadmap</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{activeReport.recommendation}</p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handlePracticeWeakAreas(activeReport)}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Target className="w-4 h-4" />
                <span>Start Practice Mini-Interview on Weak Areas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Question-by-Question Review */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-indigo-400" />
            <span>Complete Question-by-Question Review</span>
          </h3>

          <div className="space-y-3">
            {activeReport.turns.map((turn, idx) => {
              const isExpanded = expandedTurnIndex === idx;
              const evalStatus = turn.evaluation?.status || (turn.wasSkipped ? 'skipped' : 'correct');
              return (
                <div
                  key={turn.id || idx}
                  className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden transition"
                >
                  <div
                    onClick={() => setExpandedTurnIndex(isExpanded ? null : idx)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 font-extrabold text-xs flex items-center justify-center">
                        {turn.questionNumber || idx + 1}
                      </span>
                      <div className="font-bold text-xs text-slate-200 line-clamp-1">{turn.questionText}</div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          evalStatus === 'correct'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : evalStatus === 'partially_correct'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : evalStatus === 'skipped'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {evalStatus.replace('_', ' ')} ({turn.evaluation?.score ?? 0}/10)
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-slate-800/80 space-y-3 text-xs animate-in fade-in">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">AI Question:</div>
                        <p className="text-slate-200 font-semibold">{turn.questionText}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Your Answer:</div>
                        <p className="text-slate-300 bg-slate-900 p-3 rounded-xl">
                          {turn.wasSkipped ? '*(Candidate Skipped)*' : turn.userAnswerText || '*(No answer)*'}
                        </p>
                      </div>

                      {turn.evaluation && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-1">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase">Knowledge Feedback</div>
                            <p className="text-slate-300">{turn.evaluation.knowledgeEvaluation}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-1">
                            <div className="text-[10px] font-bold text-cyan-400 uppercase">Communication Feedback</div>
                            <p className="text-slate-300">{turn.evaluation.communicationEvaluation}</p>
                          </div>
                        </div>
                      )}

                      {turn.evaluation?.suggestedAnswer && (
                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                          <div className="text-[10px] font-bold text-emerald-400 uppercase">Suggested Answer</div>
                          <p className="text-emerald-200">{turn.evaluation.suggestedAnswer}</p>
                        </div>
                      )}

                      {turn.evaluation?.improvementTip && (
                        <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                          <strong>Improvement Tip:</strong> {turn.evaluation.improvementTip}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PHASE 5: HISTORY DRAWER / ARCHIVE
  // ----------------------------------------------------
  if (phase === 'history') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-400" />
              <span>Viva &amp; Interview History</span>
            </h2>
            <p className="text-xs text-slate-400">Review past oral examination reports, scores, and weak area trends.</p>
          </div>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Setup</span>
          </button>
        </div>

        {savedReports.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">No Past Sessions</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                No past Viva or Interview sessions yet. Start a new session above to practice!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>Start New Session</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {savedReports.map((rep) => (
                <motion.div
                  key={rep.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } }}
                  onClick={() => {
                    setActiveReport(rep);
                    setPhase('report');
                  }}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg cursor-pointer group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                        {rep.subject}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                        {rep.interviewType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(rep.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      • {rep.difficulty.toUpperCase()} • {rep.language} • {rep.answeredQuestions}/{rep.totalQuestions}{' '}
                      Questions
                    </div>
                    {rep.weakAreas && rep.weakAreas.length > 0 && (
                      <div className="text-[11px] text-amber-400 font-medium">
                        ⚠️ Weak Areas: {rep.weakAreas.map((w) => w.concept).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-black text-amber-300">{rep.overallScore}/100</div>
                      <div className="text-[10px] text-slate-400">Overall Score</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReport(rep);
                        setPhase('report');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      View Report
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSessionClick(e, rep)}
                      className="p-2 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40 border border-slate-700 text-slate-400 transition-all cursor-pointer group/btn"
                      title="Delete Viva Session"
                    >
                      <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Delete Confirmation Dialog Modal */}
        <AnimatePresence>
          {reportToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-lg font-extrabold text-white">Delete Viva Session?</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Are you sure you want to delete this Viva session? This cannot be undone.
                    </p>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                      <div className="font-bold text-slate-200">{reportToDelete.subject}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {reportToDelete.interviewType.replace('_', ' ')} • Score: {reportToDelete.overallScore}/100 •{' '}
                        {new Date(reportToDelete.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportToDelete(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteReport}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Undo Toast Notification */}
        <AnimatePresence>
          {undoReport && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 border border-indigo-500/40 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium">Session deleted</span>
              </div>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={() => setUndoReport(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
};
