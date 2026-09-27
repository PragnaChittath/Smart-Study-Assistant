import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { sanitizeUserFacingErrorMessage } from './server/aiClient';
import { StudySetSynthesisService } from './server/services/studySetService';
import { ComparativeMatrixService } from './server/services/comparisonService';
import { InteractiveTutorService } from './server/services/tutorService';
import { AdaptiveQuizService } from './server/services/quizService';
import { AudioPodcastService } from './server/services/podcastService';
import { ConceptDiagramService } from './server/services/mindmapService';
import { VivaInterviewOrchestrator } from './server/services/vivaService';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Health Check Probe
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Smart Study Assistant Core Engine',
  });
});

// Process Study Notes & Multi-modal Files
app.post('/api/process-notes', async (req, res) => {
  try {
    const { text, file, files, config, title, studyLanguage } = req.body;

    const fileList = Array.isArray(files) && files.length > 0
      ? files
      : file && file.data
      ? [{ name: 'Uploaded Document', mimeType: file.mimeType || 'application/pdf', data: file.data }]
      : [];

    const effectiveLanguage =
      studyLanguage || config?.studyLanguage || 'English';

    const synthesizedSet = await StudySetSynthesisService.synthesizeFromMaterials({
      textNotes: text,
      encodedFiles: fileList,
      targetLanguage: effectiveLanguage,
      config,
      title,
    });

    res.json({
      success: true,
      data: synthesizedSet,
      studySet: synthesizedSet,
      ...synthesizedSet,
    });
  } catch (error: any) {
    console.error('[API Error] /api/process-notes:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Translate Study Set
app.post('/api/translate-study-set', async (req, res) => {
  try {
    const { studySet, targetLanguage, targetLanguageCode } = req.body;
    if (!studySet) {
      return res.status(400).json({ success: false, error: 'No study set provided for translation.' });
    }

    const translatedSet = await StudySetSynthesisService.adaptStudySetLanguage({
      studySet,
      targetLanguage: targetLanguage || 'English',
      targetLanguageCode,
    });

    res.json({
      success: true,
      studySet: translatedSet,
    });
  } catch (error: any) {
    console.error('[API Error] /api/translate-study-set:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Compare Documents & Images
app.post('/api/compare-documents', async (req, res) => {
  try {
    const { studyContext, focus } = req.body;
    const comparisonResult = await ComparativeMatrixService.executeComparison({
      studyContext,
      focus,
    });

    res.json({
      success: true,
      comparison: comparisonResult,
    });
  } catch (error: any) {
    console.error('[API Error] /api/compare-documents:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Interactive AI Tutor Chat
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      messages,
      studyContext,
      history,
      audio,
      tutorLanguage,
      studyLanguage,
      studyLanguageCode,
      inputLanguage,
      inputLanguageCode,
      outputLanguage,
      outputLanguageCode,
    } = req.body;

    const replyText = await InteractiveTutorService.answerStudentQuery({
      message,
      messages,
      studyContext,
      history,
      audio,
      tutorLanguage,
      studyLanguage,
      studyLanguageCode,
      inputLanguage,
      inputLanguageCode,
      outputLanguage,
      outputLanguageCode,
    });

    res.json({
      success: true,
      reply: replyText,
      text: replyText,
    });
  } catch (error: any) {
    console.error('[API Error] /api/chat:', error);
    res.status(500).json({
      success: false,
      reply: sanitizeUserFacingErrorMessage(error),
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Adaptive Extra Quiz Generator
app.post('/api/generate-extra-quiz', async (req, res) => {
  try {
    const { studyContext, count, studyLanguage } = req.body;
    const generatedQuestions = await AdaptiveQuizService.generateAdditionalQuestions({
      studyContext,
      count: typeof count === 'number' ? count : 5,
      studyLanguage,
    });

    res.json({
      success: true,
      questions: generatedQuestions,
    });
  } catch (error: any) {
    console.error('[API Error] /api/generate-extra-quiz:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Educational Podcast Episode Generator
app.post('/api/generate-podcast', async (req, res) => {
  try {
    const {
      studyContext,
      host1Language,
      host1LanguageCode,
      host2Language,
      host2LanguageCode,
      targetLanguage,
    } = req.body;

    const podcastEpisode = await AudioPodcastService.generateDialogueEpisode({
      studyContext,
      host1Language,
      host1LanguageCode,
      host2Language,
      host2LanguageCode,
      targetLanguage,
    });

    res.json({
      success: true,
      podcast: podcastEpisode,
    });
  } catch (error: any) {
    console.error('[API Error] /api/generate-podcast:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Concept Mind Map Flowchart Generator
app.post('/api/generate-mindmap', async (req, res) => {
  try {
    const { studyContext, layoutStyle } = req.body;
    const mindMapOutput = await ConceptDiagramService.synthesizeDiagram({
      studyContext,
      layoutStyle,
    });

    res.json({
      success: true,
      mindMap: mindMapOutput,
    });
  } catch (error: any) {
    console.error('[API Error] /api/generate-mindmap:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Viva Interview: Generate Next Question
app.post('/api/viva/generate-next-question', async (req, res) => {
  try {
    const { setup, currentTurnIndex, previousTurns, sourceContext } = req.body;
    const nextQuestion = await VivaInterviewOrchestrator.generateNextQuestion({
      setup,
      currentTurnIndex: currentTurnIndex || 0,
      previousTurns: previousTurns || [],
      sourceContext,
    });

    res.json({
      success: true,
      question: nextQuestion,
    });
  } catch (error: any) {
    console.error('[API Error] /api/viva/generate-next-question:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Viva Interview: Candidate Speech Transcription
app.post('/api/viva/transcribe-answer', async (req, res) => {
  try {
    const { audioData, mimeType, languageName, languageCode } = req.body;
    if (!audioData) {
      return res.status(400).json({ success: false, error: 'No audio waveform payload provided.' });
    }

    const transcriptResult = await VivaInterviewOrchestrator.transcribeCandidateSpeech({
      audioData,
      mimeType,
      languageName,
      languageCode,
    });

    res.json({
      success: true,
      transcript: transcriptResult,
    });
  } catch (error: any) {
    console.error('[API Error] /api/viva/transcribe-answer:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Viva Interview: Performance Evaluation Report
app.post('/api/viva/generate-report', async (req, res) => {
  try {
    const { setup, turns, durationSeconds, sourceContext } = req.body;
    const finalReport = await VivaInterviewOrchestrator.evaluateSessionAndGenerateReport({
      setup,
      turns: turns || [],
      durationSeconds: durationSeconds || 0,
      sourceContext,
    });

    res.json({
      success: true,
      report: finalReport,
    });
  } catch (error: any) {
    console.error('[API Error] /api/viva/generate-report:', error);
    res.status(500).json({
      success: false,
      error: sanitizeUserFacingErrorMessage(error),
    });
  }
});

// Vite Middleware for Development / Static Hosting for Production
async function bootstrapServer() {
  if (process.env.NODE_ENV !== 'production') {
    const viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteInstance.middlewares);
  } else {
    const clientDistPath = path.join(process.cwd(), 'dist');
    app.use(express.static(clientDistPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Study Assistant Engine] Server active on port ${PORT}`);
  });
}

bootstrapServer();
