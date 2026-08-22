export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mastered?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  hint?: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
}

export interface KeyConcept {
  topic: string;
  details: string;
  importance?: 'high' | 'medium' | 'low';
}

export interface SummaryData {
  title: string;
  highLevelOverview: string;
  keyTakeaways: string[];
  keyConcepts: KeyConcept[];
  glossary: GlossaryTerm[];
  formulasOrRules?: string[];
}

export interface UploadedFileItem {
  name: string;
  mimeType: string;
  data: string; // base64 string
  size: number;
  previewUrl?: string;
  isImage?: boolean;
  isPdf?: boolean;
  isAudio?: boolean;
  audioDuration?: number;
}

export interface PodcastLine {
  id: string;
  speaker: 'Host 1' | 'Host 2';
  speakerName: string;
  text: string;
  tone?: string;
  keyPoint?: string;
  language?: string;
  languageCode?: string;
}

export interface PodcastData {
  episodeTitle: string;
  episodeTagline: string;
  durationEstimate: string;
  language?: string;
  languageCode?: string;
  host1Language?: string;
  host1LanguageCode?: string;
  host2Language?: string;
  host2LanguageCode?: string;
  hosts?: {
    host1: { name: string; role: string; language?: string; languageCode?: string };
    host2: { name: string; role: string; language?: string; languageCode?: string };
  };
  dialogue: PodcastLine[];
  keyTakeaways: string[];
  generatedAt?: string;
}

export interface MindMapTheme {
  theme: string;
  description: string;
  subtopics?: string[];
}

export interface MindMapData {
  title: string;
  mermaidSyntax: string;
  layoutStyle?: 'flowchart-td' | 'flowchart-lr' | 'mindmap';
  keyThemes: MindMapTheme[];
  overview?: string;
  generatedAt?: string;
}

export interface ContradictionItem {
  claim: string;
  sourceA: { sourceName: string; statement: string };
  sourceB: { sourceName: string; statement: string };
  analysis: string;
}

export interface ComparisonDimension {
  topic: string;
  file1Analysis: string;
  file2Analysis: string;
  synthesis: string;
}

export interface ComparisonData {
  title: string;
  overview: string;
  comparedFiles: string[];
  markdownTable: string;
  keySimilarities: string[];
  distinctDifferences: string[];
  contradictingStatements: ContradictionItem[];
  synthesizedTakeaway: string;
  dimensions?: ComparisonDimension[];
  generatedAt?: string;
}

export interface StudySet {
  id: string;
  title: string;
  subject?: string;
  tags?: string[];
  sourceType: 'pdf' | 'text' | 'image' | 'audio' | 'voice' | 'sample' | 'batch';
  sourceName: string;
  sourceFiles?: string[];
  createdAt: string;
  studyLanguage?: string;
  studyLanguageCode?: string;
  summary: SummaryData;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  podcast?: PodcastData;
  mindMap?: MindMapData;
  comparison?: ComparisonData;
  rawTextSnippet?: string;
  previewImage?: string;
  previewImages?: string[];
  audioUrl?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audio?: {
    mimeType: string;
    data: string;
    duration?: number;
  };
  isVoice?: boolean;
}

export interface ProcessingConfig {
  detailLevel: 'concise' | 'standard' | 'comprehensive';
  flashcardCount: number;
  quizQuestionCount: number;
  compareMode?: boolean;
  studyLanguage?: string;
  studyLanguageCode?: string;
}

export interface SampleNote {
  id: string;
  title: string;
  subject: string;
  iconName: string;
  description: string;
  content: string;
  tags?: string[];
}

export type VivaInterviewType =
  | 'academic_viva'
  | 'technical_interview'
  | 'hr_interview'
  | 'project_viva'
  | 'placement_interview'
  | 'custom_interview';

export type VivaDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface VivaSetupConfig {
  subject: string;
  interviewType: VivaInterviewType;
  difficulty: VivaDifficulty;
  questionCount: number;
  language: string;
  languageCode: string;
  timeLimitMinutes: number; // 0 for no limit
  sourceMaterialType: 'study_set' | 'notes' | 'manual';
  sourceText?: string;
  customInstructions?: string;
}

export interface VivaQuestionTurn {
  id: string;
  questionNumber: number;
  questionText: string;
  userAnswerText: string;
  userAnswerAudioBase64?: string;
  wasSkipped: boolean;
  timeSpentSeconds?: number;
  evaluation?: {
    status: 'correct' | 'partially_correct' | 'incorrect' | 'skipped';
    score: number; // 0 to 10
    knowledgeEvaluation: string;
    communicationEvaluation: string;
    suggestedAnswer: string;
    missingPoints: string[];
    improvementTip: string;
  };
  timestamp: string;
}

export interface VivaWeakArea {
  concept: string;
  issue: string;
  recommendedAction: string;
}

export interface VivaSuggestedAnswerItem {
  question: string;
  userAnswer: string;
  suggestedAnswer: string;
  whatWasMissing: string;
}

export interface VivaReport {
  id: string;
  title: string;
  subject: string;
  interviewType: VivaInterviewType;
  difficulty: VivaDifficulty;
  language: string;
  languageCode: string;
  totalQuestions: number;
  answeredQuestions: number;
  skippedQuestions: number;
  durationSeconds: number;
  knowledgeScore: number; // 0-100
  knowledgeScoreExplanation: string;
  communicationScore: number; // 0-100
  communicationScoreExplanation: string;
  overallScore: number; // 0-100
  strengths: string[];
  weakAreas: VivaWeakArea[];
  suggestedAnswers: VivaSuggestedAnswerItem[];
  followUpQuestions: string[];
  recommendation: string;
  turns: VivaQuestionTurn[];
  createdAt: string;
}
