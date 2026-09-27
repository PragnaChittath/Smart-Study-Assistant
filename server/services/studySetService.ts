import { Type } from '@google/genai';
import { acquireGeminiEngine, executeResilientModelCall } from '../aiClient';

export const studyPlanSchemaDefinition = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Academic and engaging study set title' },
    summary: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Executive title of summary' },
        highLevelOverview: {
          type: Type.STRING,
          description: 'Comprehensive, deep pedagogical overview of the topic with clear structural paragraphs and key takeaways',
        },
        keyTakeaways: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '5 to 10 actionable core bullet points summarizing fundamental insights',
        },
        keyConcepts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              details: { type: Type.STRING },
              importance: { type: Type.STRING, description: 'high, medium, or low' },
            },
            required: ['topic', 'details'],
          },
          description: '5 to 10 deep dives into core conceptual modules',
        },
        glossary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              example: { type: Type.STRING },
            },
            required: ['term', 'definition'],
          },
          description: '8 to 16 fundamental academic terms and definitions',
        },
        formulasOrRules: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Key mathematical formulas, physical equations, algorithmic rules, or theorems if applicable',
        },
      },
      required: ['title', 'highLevelOverview', 'keyTakeaways', 'keyConcepts', 'glossary'],
    },
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING, description: 'Active recall question or conceptual trigger' },
          back: { type: Type.STRING, description: 'Clear, comprehensive explanation or answer' },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING, description: 'easy, medium, or hard' },
        },
        required: ['front', 'back'],
      },
      description: '10 to 20 active-recall flashcard pairs designed for spaced repetition',
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exactly 4 distinct plausible options',
          },
          correctAnswerIndex: {
            type: Type.INTEGER,
            description: '0-indexed integer (0, 1, 2, or 3) indicating the correct option',
          },
          explanation: { type: Type.STRING, description: 'Detailed justification of why the answer is correct' },
          hint: { type: Type.STRING, description: 'A helpful conceptual hint for the student' },
        },
        required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
      },
      description: '6 to 12 multiple choice questions spanning foundational recall and critical thinking',
    },
  },
  required: ['title', 'summary', 'flashcards', 'quiz'],
};

export class StudySetSynthesisService {
  public static async synthesizeFromMaterials(payload: {
    textNotes?: string;
    encodedFiles?: Array<{ data: string; mimeType: string; name: string }>;
    targetLanguage?: string;
    config?: any;
    title?: string;
  }) {
    const aiEngine = acquireGeminiEngine();
    const chosenLang = payload.targetLanguage || payload.config?.studyLanguage || 'English';
    const detailLevel = payload.config?.detailLevel || 'standard';
    const targetFlashcardCount = payload.config?.flashcardCount || 10;
    const targetQuizCount = payload.config?.quizQuestionCount || 6;

    const partsBundle: any[] = [];
    const textSnippets: string[] = [];

    if (payload.textNotes && payload.textNotes.trim()) {
      textSnippets.push(`<<<INSTRUCTIONAL_SOURCE_TEXT>>>\n${payload.textNotes.trim()}\n<<<END_SOURCE_TEXT>>>`);
    }

    if (payload.encodedFiles && payload.encodedFiles.length > 0) {
      for (const attachment of payload.encodedFiles) {
        const rawBase64 = (attachment.data || '').replace(/^data:[^;]+;base64,/, '');
        const mime = (attachment.mimeType || '').toLowerCase();
        const fileName = (attachment.name || '').toLowerCase();

        // Check if file is text/code based or can be decoded into text
        const isTextFile =
          mime.startsWith('text/') ||
          mime.includes('json') ||
          mime.includes('csv') ||
          mime.includes('markdown') ||
          /\.(txt|md|markdown|csv|tsv|json|rtf|py|js|ts|jsx|tsx|html|css|cpp|c|java|sql)$/i.test(fileName);

        if (isTextFile && rawBase64) {
          try {
            const decodedText = Buffer.from(rawBase64, 'base64').toString('utf-8');
            textSnippets.push(`<<<ATTACHED_DOCUMENT: ${attachment.name}>>>\n${decodedText}\n<<<END_DOCUMENT>>>`);
            continue;
          } catch {
            // Fallback to inlineData if decode fails
          }
        }

        // Multimodal attachment (PDF, Images, Audio)
        let resolvedMime = mime;
        if (!resolvedMime || resolvedMime === 'application/octet-stream') {
          if (fileName.endsWith('.pdf')) resolvedMime = 'application/pdf';
          else if (fileName.endsWith('.png')) resolvedMime = 'image/png';
          else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) resolvedMime = 'image/jpeg';
          else if (fileName.endsWith('.webp')) resolvedMime = 'image/webp';
          else if (fileName.endsWith('.mp3')) resolvedMime = 'audio/mp3';
          else if (fileName.endsWith('.wav')) resolvedMime = 'audio/wav';
          else if (fileName.endsWith('.m4a')) resolvedMime = 'audio/m4a';
          else if (fileName.endsWith('.webm')) resolvedMime = 'audio/webm';
          else resolvedMime = 'application/pdf';
        }

        if (rawBase64) {
          partsBundle.push({
            inlineData: {
              mimeType: resolvedMime,
              data: rawBase64,
            },
          });
        }
      }
    }

    const curriculumContext = textSnippets.join('\n\n');

    const instructionPrompt = `You are a distinguished university professor, master educator, and cognitive scientist.
Transform the provided source educational materials (notes, documents, images, audio, or slides) into an exhaustive, highly structured study master-set.

TARGET LEARNING LANGUAGE: ${chosenLang}
DETAIL SPECIFICATION: ${detailLevel}
DESIRED FLASHCARDS COUNT: ${targetFlashcardCount}
DESIRED QUIZ QUESTIONS COUNT: ${targetQuizCount}

PEDAGOGICAL DIRECTIVES:
1. Title: Create an accurate, intellectually stimulating academic title for this subject.
2. Summary: Generate a deep, well-formatted structured guide containing:
   - title: An executive title
   - highLevelOverview: Deep overview with conceptual background, significance, and mechanics.
   - keyTakeaways: 5 to 10 foundational bullet takeaways.
   - keyConcepts: 5 to 10 modules with topic, details, and importance (high/medium/low).
   - glossary: 8 to 16 fundamental academic terms with precise definitions and contextual examples.
   - formulasOrRules: Explicit list of mathematical equations, laws, algorithms, or operational theorems.
3. Flashcards: Construct ${targetFlashcardCount} active-recall flashcard pairs designed for spaced repetition.
4. Quiz: Author ${targetQuizCount} multiple choice questions (with 4 options each, 0-indexed correct option, thorough explanation, and subtle hint).
5. Language Fidelity: Output all content in ${chosenLang}. Keep standard technical terms and mathematical formulas intact.

Return ONLY a valid JSON structure conforming to the specified schema.`;

    partsBundle.push({
      text: `${curriculumContext ? curriculumContext + '\n\n' : ''}${instructionPrompt}`,
    });

    const executionResult = await executeResilientModelCall(
      aiEngine,
      () => ({
        contents: { parts: partsBundle },
        config: {
          responseMimeType: 'application/json',
          responseSchema: studyPlanSchemaDefinition,
          temperature: 0.35,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
    );

    const rawResult = executionResult.parsedJson || {};

    // Normalize and safeguard all fields
    const normalizedTitle = rawResult.title || payload.title || 'Comprehensive Study Set';
    const rawSummary = rawResult.summary || {};

    const normalizedSummary = {
      title: rawSummary.title || normalizedTitle,
      highLevelOverview:
        typeof rawSummary === 'string'
          ? rawSummary
          : rawSummary.highLevelOverview || 'Comprehensive lecture summary and conceptual breakdown.',
      keyTakeaways: Array.isArray(rawSummary.keyTakeaways) && rawSummary.keyTakeaways.length > 0
        ? rawSummary.keyTakeaways
        : ['Key conceptual principles established in the material.'],
      keyConcepts: Array.isArray(rawSummary.keyConcepts) && rawSummary.keyConcepts.length > 0
        ? rawSummary.keyConcepts.map((c: any) => ({
            topic: c.topic || 'Core Concept',
            details: c.details || 'Detailed explanation of this foundational principle.',
            importance: c.importance || 'high',
          }))
        : [
            {
              topic: 'Foundational Overview',
              details: 'Core concepts and learning objectives covered in this subject.',
              importance: 'high' as const,
            },
          ],
      glossary: Array.isArray(rawSummary.glossary) && rawSummary.glossary.length > 0
        ? rawSummary.glossary.map((g: any) => ({
            term: g.term || 'Key Term',
            definition: g.definition || 'Definition of fundamental concept.',
            example: g.example || undefined,
          }))
        : [
            {
              term: 'Primary Concept',
              definition: 'Fundamental building block of this topic.',
              example: undefined,
            },
          ],
      formulasOrRules: Array.isArray(rawSummary.formulasOrRules) ? rawSummary.formulasOrRules : [],
    };

    const normalizedFlashcards = Array.isArray(rawResult.flashcards) && rawResult.flashcards.length > 0
      ? rawResult.flashcards.map((f: any, idx: number) => ({
          id: `card_${Date.now()}_${idx + 1}`,
          front: f.front || `Concept #${idx + 1}`,
          back: f.back || `Explanation for Concept #${idx + 1}`,
          category: f.category || 'Core Concepts',
          difficulty: (['easy', 'medium', 'hard'].includes(f.difficulty) ? f.difficulty : 'medium') as 'easy' | 'medium' | 'hard',
          mastered: false,
        }))
      : [
          {
            id: `card_${Date.now()}_1`,
            front: 'What is the central theme of this study set?',
            back: normalizedSummary.highLevelOverview.slice(0, 200),
            category: 'Overview',
            difficulty: 'easy' as const,
            mastered: false,
          },
        ];

    const normalizedQuiz = Array.isArray(rawResult.quiz) && rawResult.quiz.length > 0
      ? rawResult.quiz.map((q: any, idx: number) => {
          const rawOptions = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];
          const correctIdx = typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < rawOptions.length
            ? q.correctAnswerIndex
            : 0;
          return {
            id: `q_${Date.now()}_${idx + 1}`,
            question: q.question || `Question #${idx + 1}`,
            options: rawOptions,
            correctAnswerIndex: correctIdx,
            explanation: q.explanation || 'Review the study guide overview for full context.',
            hint: q.hint || undefined,
          };
        })
      : [
          {
            id: `q_${Date.now()}_1`,
            question: `What is the primary topic of ${normalizedTitle}?`,
            options: [normalizedTitle, 'Alternative Theory', 'Historical Background', 'General Mathematics'],
            correctAnswerIndex: 0,
            explanation: `The material centers on ${normalizedTitle}.`,
            hint: 'Look at the study set title.',
          },
        ];

    return {
      title: normalizedTitle,
      summary: normalizedSummary,
      flashcards: normalizedFlashcards,
      quiz: normalizedQuiz,
      rawTextSnippet: textSnippets.slice(0, 3).join('\n').slice(0, 3000),
    };
  }

  public static async adaptStudySetLanguage(payload: {
    studySet: any;
    targetLanguage: string;
    targetLanguageCode?: string;
  }) {
    const aiEngine = acquireGeminiEngine();
    const { studySet, targetLanguage, targetLanguageCode } = payload;

    const translationPrompt = `You are an expert bilingual academic translator and educational localization specialist.
Translate and culturally adapt the following comprehensive study set into ${targetLanguage}.

STUDY SET JSON:
${JSON.stringify(studySet, null, 2)}

REQUIREMENTS:
- Translate all titles, summary sections (highLevelOverview, keyTakeaways, keyConcepts, glossary terms and definitions), flashcard prompts/answers, quiz questions, options, hints, and explanations accurately into ${targetLanguage}.
- Keep standard technical keywords, standard mathematical equations, and variables recognizable.
- Maintain identical JSON structure matching the schema.`;

    const executionResult = await executeResilientModelCall(
      aiEngine,
      () => ({
        contents: translationPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: studyPlanSchemaDefinition,
          temperature: 0.3,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
    );

    const rawTranslated = executionResult.parsedJson || {};
    const translatedSet = {
      ...studySet,
      title: rawTranslated.title || studySet.title,
      studyLanguage: targetLanguage,
      studyLanguageCode: targetLanguageCode || studySet.studyLanguageCode,
      summary: rawTranslated.summary || studySet.summary,
      flashcards: (rawTranslated.flashcards || studySet.flashcards || []).map((f: any, idx: number) => ({
        ...f,
        id: studySet.flashcards?.[idx]?.id || `card_tr_${Date.now()}_${idx}`,
      })),
      quiz: (rawTranslated.quiz || studySet.quiz || []).map((q: any, idx: number) => ({
        ...q,
        id: studySet.quiz?.[idx]?.id || `q_tr_${Date.now()}_${idx}`,
      })),
    };

    return translatedSet;
  }
}
