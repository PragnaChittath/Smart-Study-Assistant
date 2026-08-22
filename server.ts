import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

// Body parser limits for PDF/text base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get Gemini Client safely
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableError(error: any): boolean {
  const msg = (error?.message || '').toLowerCase();
  const causeMsg = (error?.cause?.message || error?.cause?.code || '').toLowerCase();
  const name = (error?.name || '').toLowerCase();
  const status = error?.status || error?.code || error?.statusCode;
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('socket') ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('resource_exhausted') ||
    msg.includes('overloaded') ||
    msg.includes('quota') ||
    msg.includes('aborterror') ||
    name.includes('fetcherror') ||
    causeMsg.includes('fetch') ||
    causeMsg.includes('econnreset') ||
    causeMsg.includes('etimedout') ||
    causeMsg.includes('socket') ||
    causeMsg.includes('enotfound')
  );
}

function formatFriendlyError(error: any): string {
  const msg = error?.message || '';
  if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
    return 'The AI service is temporarily experiencing high demand. Please try again in a few moments.';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'AI generation rate limit reached. Please wait a few seconds and try again.';
  }
  if (msg.includes('GEMINI_API_KEY')) {
    return 'Gemini API key is not configured in settings.';
  }
  if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('ECONNRESET')) {
    return 'A temporary network connection issue occurred while communicating with the AI service. Please retry in a moment.';
  }
  return msg || 'An error occurred while analyzing the study material.';
}

// Fallback execution helper to handle 503 high demand or transient rate limits
async function generateWithFallbackAndRetry(
  ai: GoogleGenAI,
  requestBuilder: (model: string) => { contents: any; config?: any },
  preferredModel = 'gemini-3.1-flash-lite',
  fallbackModels = ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']
) {
  // Ensure unique list of models
  const modelsToTry = Array.from(new Set([preferredModel, ...fallbackModels]));
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { contents, config } = requestBuilder(model);
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        return { response, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || '').toLowerCase();
        const status = err?.status || err?.code || err?.statusCode;
        const isHighDemand = status === 503 || msg.includes('503') || msg.includes('high demand') || msg.includes('unavailable') || msg.includes('resource_exhausted');
        const isModelUnavailable = status === 404 || msg.includes('not_found') || msg.includes('no longer available') || msg.includes('not supported');

        // If the model is returning 503 high demand, 404 not found, or quota limits, failover smoothly to next model
        if (isHighDemand || isModelUnavailable) {
          // Switch to next fallback candidate
          await sleep(150);
          break;
        }

        if (isRetryableError(err) && attempt < 2) {
          // Exponential backoff with small random jitter
          const backoffMs = attempt * 800 + Math.floor(Math.random() * 200);
          await sleep(backoffMs);
          continue;
        } else {
          // Move on to try the next fallback model in the list
          await sleep(150);
          break;
        }
      }
    }
  }

  throw lastError;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Process lecture notes or PDF endpoint (supports single and batch multi-file uploads)
app.post('/api/process-notes', async (req, res) => {
  try {
    const { text, file, files, config, title } = req.body;

    const rawFiles: Array<{ name?: string; mimeType: string; data: string }> = Array.isArray(files)
      ? files
      : file
      ? [file]
      : [];

    if (!text && rawFiles.length === 0) {
      return res.status(400).json({ error: 'Please provide text notes or at least one uploaded document/image.' });
    }

    const ai = getGeminiClient();

    const flashcardCount = config?.flashcardCount || 8;
    const quizCount = config?.quizQuestionCount || 5;
    const detailLevel = config?.detailLevel || 'standard';
    const studyLanguage = config?.studyLanguage || req.body.studyLanguage || 'English';
    const studyLanguageCode = config?.studyLanguageCode || req.body.studyLanguageCode || 'en-US';

    const isNonEnglish = studyLanguage && studyLanguage !== 'English';
    const isMixedMode =
      studyLanguage.toLowerCase().includes('mix') ||
      studyLanguage.toLowerCase().includes('hinglish') ||
      studyLanguage.toLowerCase().includes('tanglish') ||
      studyLanguage.toLowerCase().includes('telugish') ||
      studyLanguage.toLowerCase().includes('kanglish') ||
      studyLanguage.toLowerCase().includes('manglish') ||
      studyLanguage.toLowerCase().includes('benglish') ||
      studyLanguage.toLowerCase().includes('marathinglish') ||
      studyLanguage.toLowerCase().includes('bilingual');

    let languageDirective = '';
    if (isMixedMode) {
      languageDirective = `
CRITICAL MULTILINGUAL STUDY MODE (BILINGUAL / MIXED MODE):
- Selected Study Language: "${studyLanguage}" (${studyLanguageCode}).
- The student requested study explanations in a natural, bilingual mixed blend (conversational regional language with standard English technical terms).
- Generate the entire study set (title, highLevelOverview, keyTakeaways, keyConcepts topics & deep details, glossary terms & definitions, formulas/rules, flashcards questions & answers, quiz questions, options, hints, and explanations) in this natural conversational hybrid style.
- Maintain high academic precision: preserve standard English keywords, chemical formulas, and exam terms alongside intuitive regional explanations.`;
    } else if (isNonEnglish) {
      languageDirective = `
CRITICAL MULTILINGUAL STUDY MODE (TARGET LANGUAGE: "${studyLanguage}" / Code: ${studyLanguageCode}):
- The user has requested all study material, explanations, and assessments to be generated in "${studyLanguage}".
- Source material may be in English or any other language; translate and adapt everything into authentic, fluent ${studyLanguage} using its native script (e.g. Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, Assamese, Urdu, Sanskrit, Spanish, French, German, Japanese, etc.).
- Generate ALL fields in ${studyLanguage}: title, highLevelOverview (2-4 paragraphs), keyTakeaways (5-8 items), keyConcepts (topic, details in ${studyLanguage}), glossary (term, definition, example in ${studyLanguage}), formulasOrRules, flashcards (front prompt & back answer in ${studyLanguage}), quiz questions (question, options in ${studyLanguage}, hint, thorough explanation).
- Preserve 100% of the original academic meaning, technical precision, and mathematical rigor. For specialized domain terms, you may optionally include the standard English term in parentheses alongside the native script term (e.g. "మైటోకాండ్రియా (Mitochondria)", "प्रकाश संश्लेषण (Photosynthesis)") for optimal exam clarity.`;
    }

    const imageCount = rawFiles.filter((f) => f.mimeType?.startsWith('image/')).length;
    const pdfCount = rawFiles.filter((f) => f.mimeType === 'application/pdf' || f.mimeType?.includes('pdf')).length;
    const audioCount = rawFiles.filter((f) => f.mimeType?.startsWith('audio/') || f.mimeType?.includes('audio') || f.mimeType?.includes('webm') || f.mimeType?.includes('wav') || f.mimeType?.includes('mp3') || f.mimeType?.includes('m4a')).length;
    const otherCount = rawFiles.length - imageCount - pdfCount - audioCount;

    const systemInstruction = `You are an expert AI study tutor and professor's assistant. Your job is to analyze lecture notes, documents, textbook passages, audio recordings (recorded lectures, spoken voice queries/notes in ANY language), or uploaded images (photos of handwritten notes, whiteboard diagrams, textbook pages, flowcharts, or presentation slides) and create an exceptional, highly structured study set.

Detail level requested: ${detailLevel}.
Generates exactly ${flashcardCount} flashcards and ${quizCount} multiple-choice quiz questions.
Target Study Language: ${studyLanguage} (${studyLanguageCode}).
${languageDirective}

Guidelines:
1. When files/images are provided (PNG, JPG, JPEG, WebP, PDF), perform high-precision visual and textual analysis (OCR). Carefully extract handwritten or printed text, diagrams, mathematical formulas, chemical equations, chart labels, flowcharts, and key structures regardless of input language.
2. When audio recordings or voice notes are provided (WebM, MP3, WAV, M4A, OGG, AAC in ANY language), listen carefully, transcribe the speech, and extract all key academic concepts, explanations, spoken lectures, and student questions.
3. If multiple files are uploaded (batch photos, slide decks, PDFs, audio lectures), analyze and cross-reference ALL attached files together to synthesize a unified, comprehensive study curriculum.
4. "summary": Create an engaging title reflecting the material, a clear high-level overview (2-4 paragraphs), 5-8 key takeaways, key concepts with importance ratings, key term definitions in the glossary, and any formulas, principles, or core rules.
5. "flashcards": Each flashcard must test a core concept, key term, or application. Front should be a clear question or prompt, back must be a concise, precise answer with context. Assign difficulty ('easy', 'medium', or 'hard') and category.
6. "quiz": Each question must be multiple choice with exactly 4 plausible options, a 0-based correctAnswerIndex (0, 1, 2, or 3), a helpful hint, and a thorough explanation explaining why the correct answer is right and why others are incorrect.

Return ONLY valid JSON strictly adhering to the schema.`;

    const parts: any[] = [];

    // Attach all PDF, Image, Document, or Audio files as inlineData parts
    for (const f of rawFiles) {
      if (f && f.data && f.mimeType) {
        // Ensure standard MIME type formatting
        let cleanMime = f.mimeType.toLowerCase();
        if (cleanMime.includes('png')) cleanMime = 'image/png';
        else if (cleanMime.includes('webp')) cleanMime = 'image/webp';
        else if (cleanMime.includes('jpg') || cleanMime.includes('jpeg')) cleanMime = 'image/jpeg';
        else if (cleanMime.includes('pdf')) cleanMime = 'application/pdf';
        else if (cleanMime.includes('webm')) cleanMime = 'audio/webm';
        else if (cleanMime.includes('mp3') || cleanMime.includes('mpeg')) cleanMime = 'audio/mp3';
        else if (cleanMime.includes('wav')) cleanMime = 'audio/wav';
        else if (cleanMime.includes('m4a') || cleanMime.includes('x-m4a')) cleanMime = 'audio/m4a';
        else if (cleanMime.includes('ogg')) cleanMime = 'audio/ogg';
        else if (cleanMime.includes('aac')) cleanMime = 'audio/aac';
        else if (cleanMime.includes('flac')) cleanMime = 'audio/flac';

        parts.push({
          inlineData: {
            mimeType: cleanMime,
            data: f.data, // base64 string
          },
        });
      }
    }

    let filesContext = '';
    if (rawFiles.length > 0) {
      const fileListSummary = rawFiles
        .map((f, i) => `  - File ${i + 1}: ${f.name || 'Attachment'} (${f.mimeType})`)
        .join('\n');
      filesContext = `Attached Files (${rawFiles.length} total: ${imageCount} image(s), ${pdfCount} PDF document(s), ${audioCount} audio/voice recording(s)${otherCount > 0 ? `, ${otherCount} other(s)` : ''}):\n${fileListSummary}\n\nPlease analyze all visual diagrams, handwritten notes, textbook pages, spoken voice/audio lectures, formulas, and text content across ALL ${rawFiles.length} files together to build a complete unified study set.`;
    }

    // Attach text and instruction prompt
    const textPrompt = `Study Material Title: ${title || 'Lecture Notes & Study Material'}
${text ? `Text Notes:\n${text}\n` : ''}
${filesContext}

Please process all provided materials and generate the complete study set including Summary, ${flashcardCount} Flashcards, and ${quizCount} Quiz Questions.`;

    parts.push({ text: textPrompt });

    const comparisonSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        overview: { type: Type.STRING },
        comparedFiles: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        markdownTable: { type: Type.STRING },
        keySimilarities: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        distinctDifferences: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        contradictingStatements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              sourceA: {
                type: Type.OBJECT,
                properties: {
                  sourceName: { type: Type.STRING },
                  statement: { type: Type.STRING },
                },
                required: ['sourceName', 'statement'],
              },
              sourceB: {
                type: Type.OBJECT,
                properties: {
                  sourceName: { type: Type.STRING },
                  statement: { type: Type.STRING },
                },
                required: ['sourceName', 'statement'],
              },
              analysis: { type: Type.STRING },
            },
            required: ['claim', 'sourceA', 'sourceB', 'analysis'],
          },
        },
        synthesizedTakeaway: { type: Type.STRING },
        dimensions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              file1Analysis: { type: Type.STRING },
              file2Analysis: { type: Type.STRING },
              synthesis: { type: Type.STRING },
            },
            required: ['topic', 'file1Analysis', 'file2Analysis', 'synthesis'],
          },
        },
      },
      required: ['title', 'overview', 'markdownTable', 'keySimilarities', 'distinctDifferences', 'contradictingStatements', 'synthesizedTakeaway'],
    };

    const isMultiFileOrCompare = rawFiles.length >= 2 || config?.compareMode;

    const responseSchema: any = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        summary: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            highLevelOverview: { type: Type.STRING },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            keyConcepts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  details: { type: Type.STRING },
                  importance: { type: Type.STRING },
                },
                required: ['topic', 'details'],
              },
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
            },
            formulasOrRules: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['title', 'highLevelOverview', 'keyTakeaways', 'keyConcepts', 'glossary'],
        },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              category: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ['id', 'front', 'back'],
          },
        },
        quiz: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              hint: { type: Type.STRING },
            },
            required: ['id', 'question', 'options', 'correctAnswerIndex', 'explanation'],
          },
        },
      },
      required: ['title', 'summary', 'flashcards', 'quiz'],
    };

    if (isMultiFileOrCompare) {
      responseSchema.properties.comparison = comparisonSchema;
    }

    const { response } = await generateWithFallbackAndRetry(
      ai,
      () => ({
        contents: { parts },
        config: {
          systemInstruction: isMultiFileOrCompare
            ? `${systemInstruction}\n\nSPECIAL COMPARATIVE ANALYSIS DIRECTIVE:
Because multiple files / comparison mode was activated, you MUST also perform a structured side-by-side comparative analysis under the "comparison" field:
1. "markdownTable": Build a clean, beautifully structured Markdown comparison table with columns: | Dimension / Concept | [File 1 Name] | [File 2 Name] | Synthesis & Consensus |
2. "keySimilarities": 3-6 bullet points on shared principles, overlapping models, and points of agreement.
3. "distinctDifferences": 3-6 bullet points on divergent scopes, differing approaches, or unique coverage in each source.
4. "contradictingStatements": Identify any conflicting claims, opposing figures/theories, or inconsistent assertions with source attribution and critical resolution analysis.
5. "synthesizedTakeaway": 2-3 paragraphs synthesizing the cohesive takeaways across all uploaded materials.`
            : systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']
    );

    const responseText = response.text || '{}';
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Gemini JSON output:', responseText);
      return res.status(500).json({ error: 'Failed to format study response properly.' });
    }

    // Attach metadata to comparison if present
    if (data.comparison) {
      data.comparison.generatedAt = new Date().toISOString();
      data.comparison.comparedFiles = data.comparison.comparedFiles?.length
        ? data.comparison.comparedFiles
        : rawFiles.map((f) => f.name || 'Uploaded Source');
    }

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error processing notes with Gemini:', error);
    res.status(500).json({
      error: formatFriendlyError(error),
    });
  }
});

// Endpoint to translate / adapt an existing study set into a different target language
app.post('/api/translate-study-set', async (req, res) => {
  try {
    const { studySet, targetLanguage, targetLanguageCode } = req.body;

    if (!studySet) {
      return res.status(400).json({ error: 'Study set is required for translation.' });
    }

    const ai = getGeminiClient();
    const langName = targetLanguage?.name || targetLanguage || 'English';
    const langCode = targetLanguage?.code || targetLanguageCode || 'en-US';

    const isMixedMode =
      langName.toLowerCase().includes('mix') ||
      langName.toLowerCase().includes('hinglish') ||
      langName.toLowerCase().includes('tanglish') ||
      langName.toLowerCase().includes('telugish') ||
      langName.toLowerCase().includes('kanglish') ||
      langName.toLowerCase().includes('manglish') ||
      langName.toLowerCase().includes('benglish') ||
      langName.toLowerCase().includes('marathinglish');

    const prompt = `You are a world-class academic translation and multilingual pedagogy expert.
Your mission is to translate and pedagogically adapt the entire provided Study Set into: "${langName}" (${langCode}).

${
  isMixedMode
    ? `BILINGUAL MIXED MODE DIRECTIVE:
- Use a natural conversational blend of regional language explanations with standard English technical terms (e.g. Hinglish, Tanglish, Telugish).
- Maintain rigorous conceptual accuracy, keeping formulas and technical names clear.`
    : `TARGET LANGUAGE DIRECTIVE:
- Accurately translate all text into fluent ${langName} in its authentic native script (e.g., Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, Assamese, Urdu, Sanskrit, Spanish, French, German, Japanese, etc.).
- Maintain 100% conceptual, scientific, and mathematical precision.
- Translate: Title, High-Level Overview, Key Takeaways, Key Concepts (topic + details), Glossary (term, definition, example), Formulas/Rules, Flashcards (front prompt & back answer), Quiz Questions (question, all 4 options, hint, explanation).`
}

Original Study Set Data:
${JSON.stringify(
  {
    title: studySet.title,
    summary: studySet.summary,
    flashcards: studySet.flashcards,
    quiz: studySet.quiz,
  },
  null,
  2
)}

Generate and return ONLY valid JSON matching the exact study set schema with all fields translated/adapted into ${langName}.`;

    const { response } = await generateWithFallbackAndRetry(
      ai,
      () => ({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  highLevelOverview: { type: Type.STRING },
                  keyTakeaways: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  keyConcepts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        topic: { type: Type.STRING },
                        importance: { type: Type.STRING, enum: ['high', 'medium', 'foundational'] },
                        details: { type: Type.STRING },
                      },
                      required: ['topic', 'importance', 'details'],
                    },
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
                  },
                  formulasOrRules: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['title', 'highLevelOverview', 'keyTakeaways', 'keyConcepts', 'glossary'],
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    category: { type: Type.STRING },
                    difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
                  },
                  required: ['id', 'front', 'back', 'difficulty'],
                },
              },
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                  required: ['id', 'question', 'options', 'correctAnswerIndex', 'explanation'],
                },
              },
            },
            required: ['title', 'summary', 'flashcards', 'quiz'],
          },
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']
    );

    const translatedData = JSON.parse(response.text || '{}');

    res.json({
      success: true,
      studySet: {
        ...studySet,
        title: translatedData.title || studySet.title,
        summary: translatedData.summary || studySet.summary,
        flashcards: translatedData.flashcards || studySet.flashcards,
        quiz: translatedData.quiz || studySet.quiz,
        studyLanguage: langName,
        studyLanguageCode: langCode,
      },
    });
  } catch (error: any) {
    console.error('Translation error in /api/translate-study-set:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// Dedicated endpoint to perform / regenerate structured side-by-side Comparative Analysis
app.post('/api/compare-documents', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { studyContext, files = [], focus } = req.body;

    const parts: any[] = [];
    const rawFiles = Array.isArray(files) ? files : [];

    // Attach files if provided
    for (const f of rawFiles) {
      if (f && f.data && f.mimeType) {
        let cleanMime = f.mimeType.toLowerCase();
        if (cleanMime.includes('png')) cleanMime = 'image/png';
        else if (cleanMime.includes('webp')) cleanMime = 'image/webp';
        else if (cleanMime.includes('jpg') || cleanMime.includes('jpeg')) cleanMime = 'image/jpeg';
        else if (cleanMime.includes('pdf')) cleanMime = 'application/pdf';

        parts.push({
          inlineData: {
            mimeType: cleanMime,
            data: f.data,
          },
        });
      }
    }

    const title = studyContext?.title || 'Compared Study Materials';
    const sourceFilesList = studyContext?.sourceFiles || rawFiles.map((f: any) => f.name || 'Source');
    const sourceNames = sourceFilesList.join(', ');

    const systemInstruction = `You are an elite academic knowledge comparative analyst and research synthesizer.
Your mission is to perform a rigorous, structured, side-by-side comparative analysis of the provided documents/images (${sourceNames}).

You must extract and generate:
1. "title": A clear title for the comparative report.
2. "overview": An executive summary (2-3 paragraphs) framing the core subject, historical or technical context, and scope of each source document.
3. "comparedFiles": Array of the exact file/source names compared.
4. "markdownTable": A comprehensive, neatly formatted Markdown comparison table comparing key dimensions.
   Example format:
   | Dimension / Aspect | ${sourceFilesList[0] || 'Source 1'} | ${sourceFilesList[1] || 'Source 2'} | Synthesis & Consensus |
   | :--- | :--- | :--- | :--- |
   | Core Focus | ... | ... | ... |
   | Methodology / Mechanism | ... | ... | ... |
   | Key Assumptions | ... | ... | ... |
   | Outcomes & Limitations | ... | ... | ... |
5. "keySimilarities": 4-8 bullet points highlighting foundational agreements, shared theorems, consensus definitions, and common methodologies.
6. "distinctDifferences": 4-8 bullet points highlighting divergent coverage, varying depths, differing terminology, or unique features present in only one source.
7. "contradictingStatements": An array of specific conflicting claims, opposing empirical findings, contradictory definitions, or divergent perspectives between Source A and Source B. Include the exact statement/claim from each source and a reconciliatory analysis.
8. "synthesizedTakeaway": 2-4 paragraphs providing a unified, cohesive master conclusion combining the insights of all sources into a single coherent mental model.
9. "dimensions": Structured array of 4-8 key comparison dimensions with topic, analysis for each file, and synthesis.`;

    const promptText = `Please perform a deep, structured side-by-side comparative analysis of these study materials:

Title: ${title}
${focus ? `Special Comparison Focus: ${focus}\n` : ''}
Compared Sources: ${sourceNames}

${studyContext?.summary ? `Summary Context:
Overview: ${studyContext.summary.highLevelOverview || ''}
Takeaways: ${(studyContext.summary.keyTakeaways || []).join('\n- ')}
Key Concepts: ${(studyContext.summary.keyConcepts || []).map((c: any) => `${c.topic}: ${c.details}`).join('\n- ')}` : ''}

${studyContext?.rawTextSnippet ? `Extracted Notes Snippet:\n${studyContext.rawTextSnippet.slice(0, 5000)}` : ''}

Generate the full structured JSON comparative analysis report adhering strictly to the schema.`;

    parts.push({ text: promptText });

    const comparisonResponseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        overview: { type: Type.STRING },
        comparedFiles: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        markdownTable: { type: Type.STRING },
        keySimilarities: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        distinctDifferences: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        contradictingStatements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claim: { type: Type.STRING },
              sourceA: {
                type: Type.OBJECT,
                properties: {
                  sourceName: { type: Type.STRING },
                  statement: { type: Type.STRING },
                },
                required: ['sourceName', 'statement'],
              },
              sourceB: {
                type: Type.OBJECT,
                properties: {
                  sourceName: { type: Type.STRING },
                  statement: { type: Type.STRING },
                },
                required: ['sourceName', 'statement'],
              },
              analysis: { type: Type.STRING },
            },
            required: ['claim', 'sourceA', 'sourceB', 'analysis'],
          },
        },
        synthesizedTakeaway: { type: Type.STRING },
        dimensions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              file1Analysis: { type: Type.STRING },
              file2Analysis: { type: Type.STRING },
              synthesis: { type: Type.STRING },
            },
            required: ['topic', 'file1Analysis', 'file2Analysis', 'synthesis'],
          },
        },
      },
      required: ['title', 'overview', 'markdownTable', 'keySimilarities', 'distinctDifferences', 'contradictingStatements', 'synthesizedTakeaway'],
    };

    const { response } = await generateWithFallbackAndRetry(
      ai,
      () => ({
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: comparisonResponseSchema,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']
    );

    const data = JSON.parse(response.text || '{}');
    data.generatedAt = new Date().toISOString();
    if (!data.comparedFiles || data.comparedFiles.length === 0) {
      data.comparedFiles = sourceFilesList;
    }

    res.json({
      success: true,
      comparison: data,
    });
  } catch (error: any) {
    console.error('Comparative analysis error:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// AI Tutor Chat route for follow-up questions
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages,
      studyContext,
      audio,
      studyLanguage,
      studyLanguageCode,
      inputLanguage,
      inputLanguageCode,
      outputLanguage,
      outputLanguageCode,
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getGeminiClient();
    const activeInputLang = inputLanguage || studyLanguage || studyContext?.studyLanguage || 'Telugu';
    const activeInputCode = inputLanguageCode || studyLanguageCode || studyContext?.studyLanguageCode || 'te-IN';
    const activeOutputLang = outputLanguage || studyLanguage || studyContext?.studyLanguage || 'English';
    const activeOutputCode = outputLanguageCode || studyLanguageCode || studyContext?.studyLanguageCode || 'en-US';

    const isOutputMixed = activeOutputLang.toLowerCase().includes('mix') || activeOutputLang.toLowerCase().includes('hinglish') || activeOutputLang.toLowerCase().includes('telugish') || activeOutputLang.toLowerCase().includes('tanglish');

    const systemInstruction = `You are an encouraging, expert AI Study Assistant and Tutor. You are helping a student master material from their study notes.

Study Material Overview:
Title: ${studyContext?.title || 'Lecture Notes'}
High-Level Summary: ${studyContext?.summary?.highLevelOverview || ''}
Key Takeaways: ${studyContext?.summary?.keyTakeaways?.join('; ') || ''}

Language Configuration:
- ⌨️ Student Input Language: "${activeInputLang}" (${activeInputCode})
- 🤖 Required AI Output Language: "${activeOutputLang}" (${activeOutputCode})

STRICT LANGUAGE DIRECTIVES:
1. UNDERSTAND INPUT: The student may ask questions by typing or speaking in "${activeInputLang}" (using its native script or transliteration) or in ANY other language. Accurately interpret their intent, question, or voice clip.
2. FORMULATE OUTPUT: You MUST formulate and return your entire tutor response STRICTLY in "${activeOutputLang}".
${isOutputMixed ? `3. MIXED MODE GUIDANCE: Provide warm, natural conversational explanations in the regional language while preserving standard English academic/technical keywords.` : `3. NATIVE SCRIPT GUIDANCE: If "${activeOutputLang}" is a regional or international language (e.g. Telugu, Hindi, Tamil, Kannada, Spanish, French, etc.), provide your explanation in high-quality, authentic native script with crystal-clear academic explanations.`}
4. Provide clear, concise, and helpful answers with bullet points, bold key terms, and simple real-world analogies where appropriate.
5. Preserve mathematical formulas, chemical equations, and code blocks accurately.
6. Stay faithful to the provided study material.`;

    const lastMessage = messages[messages.length - 1];
    const incomingAudio = audio || lastMessage?.audio;

    const parts: any[] = [];

    // Attach audio inlineData if student sent a voice recording or audio clip
    if (incomingAudio && incomingAudio.data && incomingAudio.mimeType) {
      let cleanAudioMime = incomingAudio.mimeType.toLowerCase();
      if (cleanAudioMime.includes('webm')) cleanAudioMime = 'audio/webm';
      else if (cleanAudioMime.includes('mp3') || cleanAudioMime.includes('mpeg')) cleanAudioMime = 'audio/mp3';
      else if (cleanAudioMime.includes('wav')) cleanAudioMime = 'audio/wav';
      else if (cleanAudioMime.includes('m4a') || cleanAudioMime.includes('x-m4a')) cleanAudioMime = 'audio/m4a';
      else if (cleanAudioMime.includes('ogg')) cleanAudioMime = 'audio/ogg';
      else if (cleanAudioMime.includes('aac')) cleanAudioMime = 'audio/aac';
      else if (cleanAudioMime.includes('flac')) cleanAudioMime = 'audio/flac';

      parts.push({
        inlineData: {
          mimeType: cleanAudioMime,
          data: incomingAudio.data,
        },
      });

      const audioPromptText = lastMessage?.text && !lastMessage.text.startsWith('🎤')
        ? `The student asked a question via the attached spoken voice recording (Input Language: ${activeInputLang}) with note: "${lastMessage.text}". Please listen carefully, understand their question, and answer thoroughly in the required Output Language (${activeOutputLang}).`
        : `The student asked a question via this spoken voice recording in ${activeInputLang}. Please listen carefully, understand their question, and provide a clear, helpful, and friendly tutor explanation in the required Output Language (${activeOutputLang}) based on the study material.`;

      parts.push({ text: audioPromptText });
    } else {
      const prompt = lastMessage?.text || 'Can you summarize the main point?';
      parts.push({ text: prompt });
    }

    const { response } = await generateWithFallbackAndRetry(
      ai,
      () => ({
        contents: { parts },
        config: {
          systemInstruction,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']
    );

    res.json({
      reply: response.text || 'I apologize, but I could not generate an answer at this moment.',
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// Generate extra practice questions on demand
app.post('/api/generate-extra-quiz', async (req, res) => {
  try {
    const { studyContext, count = 5, studyLanguage } = req.body;
    const ai = getGeminiClient();

    const targetLang = studyLanguage || studyContext?.studyLanguage || 'English';

    const prompt = `Based on the following study topic: "${studyContext?.title || 'Lecture Notes'}", generate ${count} NEW, challenging multiple-choice quiz questions that test deep understanding.
Target Language: ${targetLang} (generate questions, all 4 options, hints, and explanations in ${targetLang}).
Summary Context: ${studyContext?.summary?.highLevelOverview || ''}`;

    const { response } = await generateWithFallbackAndRetry(
      ai,
      () => ({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctAnswerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                hint: { type: Type.STRING },
              },
              required: ['id', 'question', 'options', 'correctAnswerIndex', 'explanation'],
            },
          },
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']
    );

    const data = JSON.parse(response.text || '[]');
    res.json({ questions: data });
  } catch (error: any) {
    console.error('Generate extra quiz error:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// Generate 5-Minute Mini Podcast dialogue between two hosts (supports dual independent languages)
app.post('/api/generate-podcast', async (req, res) => {
  try {
    const {
      studyContext,
      language = 'English',
      languageCode = 'en-US',
      host1Language: reqHost1Lang,
      host1LanguageCode: reqHost1Code,
      host2Language: reqHost2Lang,
      host2LanguageCode: reqHost2Code,
    } = req.body;
    const ai = getGeminiClient();

    const host1Lang = reqHost1Lang || language || 'English';
    const host1Code = reqHost1Code || languageCode || 'en-US';
    const host2Lang = reqHost2Lang || language || 'English';
    const host2Code = reqHost2Code || languageCode || 'en-US';

    const isDualLanguage = host1Code !== host2Code;

    const title = studyContext?.title || 'Study Material Overview';
    const overview = studyContext?.summary?.highLevelOverview || '';
    const takeaways = studyContext?.summary?.keyTakeaways?.join('\n- ') || '';
    const concepts = studyContext?.summary?.keyConcepts
      ?.map((c: any) => `${c.topic}: ${c.details}`)
      .join('\n- ') || '';
    const glossary = studyContext?.summary?.glossary
      ?.map((g: any) => `${g.term}: ${g.definition}`)
      .join('; ') || '';
    const rawSnippet = studyContext?.rawTextSnippet || '';

    let languageDirective = '';
    if (isDualLanguage) {
      languageDirective = `CRITICAL DUAL-HOST INDEPENDENT LANGUAGE REQUIREMENT:
The user has configured MULTILINGUAL host modes:
- Host 1 (Alex) MUST speak exclusively in ${host1Lang} (locale code: ${host1Code}, using its official native script and vocabulary).
- Host 2 (Sam) MUST speak exclusively in ${host2Lang} (locale code: ${host2Code}, using its official native script and vocabulary).

Important Rules for Dual-Language Dialogue:
1. Every single line by Host 1 MUST be in fluent, natural ${host1Lang}.
2. Every single line by Host 2 MUST be in fluent, natural ${host2Lang}.
3. Host 1 and Host 2 understand each other perfectly and have a vibrant, seamless academic conversation where each host responds meaningfully to the points made by the other in their respective language.
4. Keep technical and conceptual terms clear, natural, and student-friendly.
5. All text in 'dialogue.text' must be written directly in the corresponding host's official script for browser Text-to-Speech synthesis (e.g., Devanagari for Hindi/Marathi/Sanskrit/Nepali, Tamil script for Tamil, Telugu script for Telugu, Bengali for Bengali/Assamese, Gujarati for Gujarati, Gurmukhi for Punjabi, Japanese Kanji/Kana for Japanese, Cyrillic for Russian/Ukrainian, Arabic script for Arabic/Urdu/Persian, Hangul for Korean, Latin alphabets for European languages).`;
    } else if (host1Lang.toLowerCase() !== 'english' && !host1Code.startsWith('en')) {
      languageDirective = `CRITICAL LANGUAGE REQUIREMENT:
The user has requested this entire podcast episode in ${host1Lang} (locale code: ${host1Code}).
- You MUST write the entire dialogue ('dialogue.text'), episode title ('episodeTitle'), episode tagline ('episodeTagline'), and key takeaways ('keyTakeaways') in natural, fluent, conversational ${host1Lang} using its official native script.
- The dialogue must sound lively, natural, and engaging as spoken in ${host1Lang}, perfectly suited for browser Text-to-Speech synthesis in ${host1Code}.
- Keep technical or domain-specific names/terms natural and easily understandable for students studying this subject in ${host1Lang}.`;
    } else {
      languageDirective = `Write exclusively in smooth, spoken conversational English.`;
    }

    const systemInstruction = `You are an elite educational podcast producer and scriptwriter.
Your mission is to produce a high-energy, intellectually curious 5-minute conversational podcast recap based on the user's study notes.
The podcast is hosted by two engaging characters:
- Host 1 (Alex): Curious, relatable, asks great questions, provides everyday analogies, and sets up topics with excitement. (Language: ${host1Lang})
- Host 2 (Sam): Insightful, knowledgeable, breaks down mechanisms, clarifies confusing details, and highlights exam takeaways. (Language: ${host2Lang})

Podcast Structure & Guidelines:
1. Catchy Intro: Host 1 welcomes listeners in ${host1Lang} and hooks them with an interesting real-world dilemma or question related to "${title}".
2. Core Conceptual Breakdown: Host 2 explains the fundamental principles in ${host2Lang}, with Host 1 asking natural clarifying questions in ${host1Lang}.
3. Real-world Analogies & Aha! Moments: Use memorable metaphors and comparisons to make complex concepts intuitive.
4. Watch Outs & Nuances: Point out common student misconceptions or tricky distinctions.
5. High-Impact Recap & Outro: Rapid-fire takeaway summary and an uplifting sign-off.
6. Length: Produce a substantial dialogue (18-26 balanced back-and-forth lines) that naturally flows for about 4-5 minutes when spoken.
7. Text-to-Speech Friendly: Write smooth, spoken conversational sentences without markdown symbols, bullet points, asterisks, or unpronounceable symbols.

${languageDirective}`;

    const prompt = `Create an immersive 5-minute mini podcast episode recap for the topic: "${title}".
Host 1 Language: ${host1Lang} (${host1Code})
Host 2 Language: ${host2Lang} (${host2Code})

Study Context:
Overview: ${overview}

Key Takeaways:
- ${takeaways}

Key Concepts:
- ${concepts}

Glossary: ${glossary}

Additional Source Notes:
${rawSnippet.slice(0, 3000)}

Generate the complete episode script as structured JSON with episode title, tagline, duration estimate, host bios (including each host's configured language), dialogue exchanges alternating between Host 1 (in ${host1Lang}) and Host 2 (in ${host2Lang}), and key takeaways.`;

    const podcastResponseSchema = {
      type: Type.OBJECT,
      properties: {
        episodeTitle: { type: Type.STRING },
        episodeTagline: { type: Type.STRING },
        durationEstimate: { type: Type.STRING },
        hosts: {
          type: Type.OBJECT,
          properties: {
            host1: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
              },
              required: ['name', 'role'],
            },
            host2: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
              },
              required: ['name'],
            },
          },
          required: ['host1', 'host2'],
        },
        dialogue: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              speaker: { type: Type.STRING },
              speakerName: { type: Type.STRING },
              text: { type: Type.STRING },
              tone: { type: Type.STRING },
              keyPoint: { type: Type.STRING },
            },
            required: ['id', 'speaker', 'speakerName', 'text'],
          },
        },
        keyTakeaways: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['episodeTitle', 'episodeTagline', 'dialogue', 'keyTakeaways'],
    };

    const { response } = await generateWithFallbackAndRetry(
      ai,
      () => ({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: podcastResponseSchema,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']
    );

    const data = JSON.parse(response.text || '{}');
    // Ensure all dialogue items have proper speaker values and language tags
    if (data.dialogue && Array.isArray(data.dialogue)) {
      data.dialogue = data.dialogue.map((line: any, idx: number) => {
        const isH2 = line.speaker?.includes('2') || line.speakerName?.includes('2') || line.speakerName?.includes('Sam');
        return {
          id: line.id || `line_${idx + 1}`,
          speaker: isH2 ? 'Host 2' : 'Host 1',
          speakerName: line.speakerName || (isH2 ? `Host 2 (Sam - ${host2Lang})` : `Host 1 (Alex - ${host1Lang})`),
          text: line.text || '',
          tone: line.tone || 'engaging',
          keyPoint: line.keyPoint || undefined,
          language: isH2 ? host2Lang : host1Lang,
          languageCode: isH2 ? host2Code : host1Code,
        };
      });
    }

    res.json({
      success: true,
      podcast: {
        ...data,
        language: isDualLanguage ? `${host1Lang} & ${host2Lang}` : host1Lang,
        languageCode: isDualLanguage ? `${host1Code}+${host2Code}` : host1Code,
        host1Language: host1Lang,
        host1LanguageCode: host1Code,
        host2Language: host2Lang,
        host2LanguageCode: host2Code,
        hosts: {
          host1: {
            name: data.hosts?.host1?.name || 'Alex (Host 1)',
            role: data.hosts?.host1?.role || 'Host & Explorer',
            language: host1Lang,
            languageCode: host1Code,
          },
          host2: {
            name: data.hosts?.host2?.name || 'Sam (Host 2)',
            role: data.hosts?.host2?.role || 'SME & Co-Host',
            language: host2Lang,
            languageCode: host2Code,
          },
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Generate podcast error:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// Endpoint to generate visual Mermaid.js Mind Map and Concept Graph
app.post('/api/generate-mindmap', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { studyContext, layoutStyle = 'flowchart-td', focus } = req.body;

    if (!studyContext) {
      return res.status(400).json({ error: 'Study context or document data is required.' });
    }

    const title = studyContext.title || 'Study Material';
    const overview = studyContext.summary?.highLevelOverview || '';
    const takeaways = (studyContext.summary?.keyTakeaways || []).join('\n- ');
    const concepts = (studyContext.summary?.keyConcepts || [])
      .map((c: any) => `${c.topic}: ${c.details} (Priority: ${c.importance || 'normal'})`)
      .join('\n- ');
    const glossary = (studyContext.summary?.glossary || [])
      .map((g: any) => `${g.term}: ${g.definition}`)
      .join('; ');
    const formulas = (studyContext.summary?.formulasOrRules || []).join('; ');
    const rawSnippet = studyContext.rawTextSnippet || '';

    const systemInstruction = `You are an elite educational knowledge architect and visual diagramming expert.
Your mission is to extract key themes, core principles, subtopics, relationships, and mechanisms from the provided study material and generate:
1. Clean, valid, and visually engaging Mermaid.js flowchart syntax.
2. Structured themes breakdown with descriptions and subtopics.
3. An executive conceptual overview explaining the map hierarchy.

CRITICAL MERMAID.JS SYNTAX RULES:
1. Start the diagram with: "${layoutStyle === 'flowchart-lr' ? 'flowchart LR' : 'flowchart TD'}".
2. Node IDs MUST be simple alphanumeric strings without spaces, dashes, or special characters (e.g. root, theme1, sub1_1, leaf1_1_1, procA).
3. Always wrap all node label text in double quotes inside brackets:
   - Example: root["🚀 ${title.replace(/"/g, "'")}"]
   - Example: theme1["📚 Fundamental Principles"]
   - Example: sub1_1["⚙️ Core Mechanism"]
4. NEVER use unescaped double quotes, parentheses, brackets, colons, or HTML tags inside the node label text. If needed, use clean alphanumeric text and standard punctuation like hyphens or commas.
5. Create a rich, multi-tier hierarchy:
   - Root node: Central topic title.
   - Tier 1: 3 to 6 Major Themes/Pillars.
   - Tier 2: 2 to 4 Sub-concepts / mechanisms / key laws under each Theme.
   - Tier 3: Practical examples, equations, key definitions, or outcomes under relevant sub-concepts.
6. Connect nodes with clear directed arrows (-->) and optional relationship annotations (e.g. nodeA -->|causes| nodeB).
7. You may group major themes using subgraphs for exceptional visual organization:
   subgraph PillarA ["Theme: Core Dynamics"]
     subA1["Concept 1"] --> subA2["Concept 2"]
   end
8. Add styling classes at the end of the Mermaid diagram:
   classDef rootStyle fill:#4338ca,stroke:#6366f1,stroke-width:3px,color:#ffffff,font-weight:bold;
   classDef themeStyle fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff,font-weight:bold;
   classDef subStyle fill:#0f172a,stroke:#38bdf8,stroke-width:1px,color:#f8fafc;
   classDef detailStyle fill:#1e293b,stroke:#94a3b8,stroke-width:1px,color:#cbd5e1;
   class root rootStyle;
   class theme1,theme2,theme3,theme4,theme5 themeStyle;
9. Output pure valid JSON matching the requested schema. Do NOT include markdown code fences around the JSON.`;

    const prompt = `Please analyze this study material and create a comprehensive Mind Map and Concept Flowchart in Mermaid.js syntax:

Study Set Title: ${title}
${focus ? `Special Focus: ${focus}` : ''}

Executive Overview:
${overview}

Key Takeaways:
- ${takeaways}

Key Concepts:
- ${concepts}

${glossary ? `Glossary & Definitions:\n${glossary}\n` : ''}
${formulas ? `Formulas & Rules:\n${formulas}\n` : ''}

Additional Source Notes:
${rawSnippet.slice(0, 4000)}

Extract the core themes, construct the complete valid Mermaid.js diagram (${layoutStyle === 'flowchart-lr' ? 'flowchart LR' : 'flowchart TD'}), and return the structured JSON.`;

    const mindmapResponseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        mermaidSyntax: { type: Type.STRING },
        overview: { type: Type.STRING },
        keyThemes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              theme: { type: Type.STRING },
              description: { type: Type.STRING },
              subtopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['theme', 'description'],
          },
        },
      },
      required: ['title', 'mermaidSyntax', 'keyThemes'],
    };

    const { response } = await generateWithFallbackAndRetry(
      ai,
      () => ({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: mindmapResponseSchema,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']
    );

    const data = JSON.parse(response.text || '{}');

    // Clean up mermaid syntax (strip any residual markdown fences)
    let cleanedSyntax = (data.mermaidSyntax || '').trim();
    cleanedSyntax = cleanedSyntax.replace(/^```(?:mermaid)?\n?/i, '').replace(/\n?```$/i, '').trim();

    if (!cleanedSyntax.startsWith('flowchart') && !cleanedSyntax.startsWith('graph') && !cleanedSyntax.startsWith('mindmap')) {
      cleanedSyntax = `${layoutStyle === 'flowchart-lr' ? 'flowchart LR' : 'flowchart TD'}\n${cleanedSyntax}`;
    }

    res.json({
      success: true,
      mindMap: {
        title: data.title || `${title} Concept Map`,
        mermaidSyntax: cleanedSyntax,
        layoutStyle,
        keyThemes: Array.isArray(data.keyThemes) ? data.keyThemes : [],
        overview: data.overview || `Hierarchical concept mind map organizing ${title} into key themes and interconnected subtopics.`,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Generate mind map error:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// ==========================================
// VIVA & INTERVIEW SIMULATOR ENDPOINTS
// ==========================================

const vivaNextQuestionSchema = {
  type: Type.OBJECT,
  properties: {
    questionText: {
      type: Type.STRING,
      description: 'The exact question to ask the candidate in the specified interview language. Must be clear, professional, and concise.',
    },
    contextFollowUpRationale: {
      type: Type.STRING,
      description: 'Brief examiner internal reasoning for choosing this question based on candidate trajectory.',
    },
  },
  required: ['questionText'],
};

// Next Question Generator (Adaptive AI Examiner)
app.post('/api/viva/next-question', async (req, res) => {
  try {
    const { setup, conversationHistory, questionNumber, totalQuestions, sourceContext } = req.body;
    const ai = getGeminiClient();

    const langName = setup?.language || 'English';
    const interviewType = setup?.interviewType || 'academic_viva';
    const difficulty = setup?.difficulty || 'intermediate';
    const subject = setup?.subject || 'General Academic Topic';

    const systemInstruction = `You are a distinguished, realistic AI Examiner and Interviewer conducting a formal ${interviewType.replace('_', ' ').toUpperCase()} on the subject "${subject}".

ROLE & BEHAVIOR:
- You are asking Question ${questionNumber} of ${totalQuestions}.
- Language Requirement: You MUST formulate the question in ${langName}. Retain standard technical terminology where universally recognized in engineering/science, but keep all conversational phrasing in ${langName}.
- Interview Type Focus:
  * academic_viva: Deep conceptual understanding, syllabus principles, theoretical foundations, proofs, and definitions.
  * technical_interview: Problem solving, data structures, algorithms, system architecture, trade-offs, debugging, time/space complexity.
  * hr_interview: Behavioral questions, communication, teamwork, conflict resolution, situational judgment.
  * project_viva: Architectural decisions, challenges faced, tech stack choices, testing methodology, performance optimizations.
  * placement_interview: Comprehensive blend of core computer science/domain fundamentals and analytical aptitude.
  * custom_interview: Focus tailored to user topic and custom instructions.

ADAPTIVE QUESTIONING LOGIC:
- If this is Question 1: Ask a solid, fundamental opening question appropriate for ${difficulty} difficulty.
- If following previous answers:
  * If the previous answer was Strong/Accurate: Follow up with a deeper, more challenging or application-oriented question.
  * If the previous answer was Partial: Ask a focused concept-check or clarification question.
  * If the previous answer was Incorrect or Skipped: Pivot to a related foundational concept to pinpoint the knowledge boundary without being condescending.
- Examiner Tone: Professional, direct, concise, and courteous. DO NOT reveal the correct answers to previous questions during the active interview. DO NOT repeat earlier questions. Ask ONE single standalone question.`;

    const prompt = `INTERVIEW CONTEXT:
Subject/Topic: ${subject}
Difficulty Level: ${difficulty}
Current Question: ${questionNumber} of ${totalQuestions}
Target Language: ${langName}

${sourceContext ? `REFERENCE STUDY MATERIAL / NOTES:\n"""\n${sourceContext.slice(0, 7000)}\n"""\n` : ''}

CONVERSATION HISTORY SO FAR:
${
  Array.isArray(conversationHistory) && conversationHistory.length > 0
    ? conversationHistory
        .map(
          (turn: any, idx: number) =>
            `[Q${turn.questionNumber || idx + 1}]: ${turn.questionText}\n[Candidate Answer]: ${
              turn.wasSkipped ? '<Candidate Skipped Question>' : turn.userAnswerText || '<No Answer Provided>'
            }`
        )
        .join('\n\n')
    : 'No previous questions asked yet. This is the opening question.'
}

Generate Question ${questionNumber} now in ${langName}. Return valid JSON.`;

    const { response } = await generateWithFallbackAndRetry(
      ai,
      (model) => ({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: vivaNextQuestionSchema,
          temperature: 0.7,
        },
      }),
      'gemini-3.7-flash',
      ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.1-pro-preview']
    );

    const data = JSON.parse(response.text || '{}');

    res.json({
      success: true,
      questionText: data.questionText || `Could you explain the core fundamentals of ${subject}?`,
      contextFollowUpRationale: data.contextFollowUpRationale || '',
    });
  } catch (error: any) {
    console.error('Viva next question error:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// Viva Speech-to-Text Multimodal Audio Transcription
app.post('/api/viva/transcribe-audio', async (req, res) => {
  try {
    const { audioData, mimeType, languageCode, languageName } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = audioData.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '');

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Transcribe this candidate's spoken interview answer with high phonetic and grammatical accuracy.
Candidate's selected language: ${languageName || languageCode || 'Original spoken language'}.
Instructions:
- Return ONLY the exact transcribed text.
- Do not add conversational prefixes, markdown quotes, or timestamps.
- Accurately preserve technical terminology even when spoken in Indian regional or non-English languages.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts: [audioPart, textPart] },
    });

    const transcript = (response.text || '').trim();

    res.json({
      success: true,
      transcript,
    });
  } catch (error: any) {
    console.error('Viva transcribe error:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// Comprehensive Viva Evaluation & Report Generator
const vivaReportSchema = {
  type: Type.OBJECT,
  properties: {
    knowledgeScore: {
      type: Type.INTEGER,
      description: 'Knowledge Score from 0 to 100 evaluating conceptual depth, accuracy, correctness of examples.',
    },
    knowledgeScoreExplanation: {
      type: Type.STRING,
      description: 'Concise explanation of the knowledge evaluation (1-2 sentences).',
    },
    communicationScore: {
      type: Type.INTEGER,
      description: 'Communication Score from 0 to 100 evaluating clarity, relevance, structure, conciseness, technical vocabulary.',
    },
    communicationScoreExplanation: {
      type: Type.STRING,
      description: 'Concise explanation of the communication evaluation (1-2 sentences).',
    },
    overallScore: {
      type: Type.INTEGER,
      description: 'Overall blended interview score from 0 to 100.',
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2 to 4 distinct conceptual strengths demonstrated by the candidate.',
    },
    weakAreas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          concept: { type: Type.STRING, description: 'Specific concept or topic where candidate struggled.' },
          issue: { type: Type.STRING, description: 'Exact gap or misconception observed in the answers.' },
          recommendedAction: { type: Type.STRING, description: 'Actionable study advice to master this concept.' },
        },
        required: ['concept', 'issue', 'recommendedAction'],
      },
      description: 'List of specific weak areas based on actual answers.',
    },
    suggestedAnswers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: 'The question asked.' },
          userAnswer: { type: Type.STRING, description: "The candidate's response." },
          suggestedAnswer: { type: Type.STRING, description: 'The ideal model answer with precise technical accuracy.' },
          whatWasMissing: { type: Type.STRING, description: "Brief explanation of what was missing from candidate's answer." },
        },
        required: ['question', 'userAnswer', 'suggestedAnswer', 'whatWasMissing'],
      },
      description: 'Suggested model answers for questions that were incomplete, inaccurate, or skipped.',
    },
    followUpQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 to 5 targeted follow-up practice questions specifically addressing identified weak areas.',
    },
    recommendation: {
      type: Type.STRING,
      description: 'Constructive, professional final assessment and personalized roadmap for upcoming real-world interviews.',
    },
    turnEvaluations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.INTEGER },
          status: { type: Type.STRING, description: 'correct, partially_correct, incorrect, or skipped' },
          score: { type: Type.INTEGER, description: 'Score out of 10 for this individual answer' },
          knowledgeEvaluation: { type: Type.STRING },
          communicationEvaluation: { type: Type.STRING },
          suggestedAnswer: { type: Type.STRING },
          missingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvementTip: { type: Type.STRING },
        },
        required: [
          'questionNumber',
          'status',
          'score',
          'knowledgeEvaluation',
          'communicationEvaluation',
          'suggestedAnswer',
          'missingPoints',
          'improvementTip',
        ],
      },
      description: 'Detailed question-by-question breakdown of performance.',
    },
  },
  required: [
    'knowledgeScore',
    'knowledgeScoreExplanation',
    'communicationScore',
    'communicationScoreExplanation',
    'overallScore',
    'strengths',
    'weakAreas',
    'suggestedAnswers',
    'followUpQuestions',
    'recommendation',
    'turnEvaluations',
  ],
};

app.post('/api/viva/generate-report', async (req, res) => {
  try {
    const { setup, turns, durationSeconds, sourceContext } = req.body;
    const ai = getGeminiClient();

    const subject = setup?.subject || 'Interview';
    const interviewType = setup?.interviewType || 'academic_viva';
    const difficulty = setup?.difficulty || 'intermediate';
    const langName = setup?.language || 'English';

    const systemInstruction = `You are a senior academic examiner and technical interview panel chair evaluating a completed ${interviewType.replace('_', ' ')} on "${subject}".

EVALUATION CRITERIA:
1. Knowledge Score (0-100):
   - Conceptual understanding & technical precision
   - Depth of explanation and accuracy
   - Correct use of formulas, algorithms, or definitions
   - Practical application and examples

2. Communication Score (0-100):
   - Structure & logical flow of thoughts
   - Clarity and conciseness (avoiding rambling or vague filler)
   - Professional tone and technical vocabulary
   - Do NOT judge accent or non-native phrasing harshly; evaluate semantic clarity and content structure.

3. Overall Score (0-100): Weighted synthesis of knowledge (70%) and communication (30%).

4. Detailed Turn-by-Turn Evaluations:
   - For every question in the interview, provide status (correct, partially_correct, incorrect, skipped), score (0-10), what was missing, model suggested answer, and improvement tip.
   - For weak or skipped responses, provide thorough model answers.

5. Language: Output all feedback and explanations in ${langName} while keeping standard technical terms accurate.`;

    const prompt = `INTERVIEW SUMMARY & CANDIDATE TRANSCRIPT:
Subject: ${subject}
Interview Type: ${interviewType}
Difficulty: ${difficulty}
Language: ${langName}
Total Duration: ${Math.round((durationSeconds || 0) / 60)} minutes

${sourceContext ? `REFERENCE MATERIAL:\n"""\n${sourceContext.slice(0, 6000)}\n"""\n` : ''}

QUESTIONS & CANDIDATE RESPONSES:
${
  Array.isArray(turns) && turns.length > 0
    ? turns
        .map(
          (t: any, idx: number) =>
            `--- Question ${t.questionNumber || idx + 1} ---
AI Question: ${t.questionText}
Candidate Answer: ${t.wasSkipped ? '[CANDIDATE SKIPPED QUESTION]' : t.userAnswerText || '[NO ANSWER GIVEN]'}`
        )
        .join('\n\n')
    : 'No questions answered.'
}

Evaluate this interview thoroughly and generate the complete assessment report in valid JSON.`;

    const { response } = await generateWithFallbackAndRetry(
      ai,
      (model) => ({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: vivaReportSchema,
          temperature: 0.4,
        },
      }),
      'gemini-3.7-flash',
      ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.1-pro-preview']
    );

    const reportData = JSON.parse(response.text || '{}');

    // Merge turn evaluations back onto turns
    const enrichedTurns = (turns || []).map((turn: any, index: number) => {
      const evalItem =
        (reportData.turnEvaluations || []).find(
          (te: any) => te.questionNumber === turn.questionNumber || te.questionNumber === index + 1
        ) || (reportData.turnEvaluations || [])[index];

      return {
        ...turn,
        evaluation: evalItem
          ? {
              status: evalItem.status || (turn.wasSkipped ? 'skipped' : 'partially_correct'),
              score: typeof evalItem.score === 'number' ? evalItem.score : turn.wasSkipped ? 0 : 5,
              knowledgeEvaluation: evalItem.knowledgeEvaluation || '',
              communicationEvaluation: evalItem.communicationEvaluation || '',
              suggestedAnswer: evalItem.suggestedAnswer || '',
              missingPoints: Array.isArray(evalItem.missingPoints) ? evalItem.missingPoints : [],
              improvementTip: evalItem.improvementTip || '',
            }
          : undefined,
      };
    });

    const finalReport = {
      id: `viva_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${subject} (${interviewType.replace('_', ' ').toUpperCase()})`,
      subject,
      interviewType,
      difficulty,
      language: langName,
      languageCode: setup?.languageCode || 'en-US',
      totalQuestions: turns?.length || setup?.questionCount || 5,
      answeredQuestions: (turns || []).filter((t: any) => !t.wasSkipped && t.userAnswerText?.trim()).length,
      skippedQuestions: (turns || []).filter((t: any) => t.wasSkipped || !t.userAnswerText?.trim()).length,
      durationSeconds: durationSeconds || 0,
      knowledgeScore: typeof reportData.knowledgeScore === 'number' ? reportData.knowledgeScore : 75,
      knowledgeScoreExplanation: reportData.knowledgeScoreExplanation || 'Good conceptual grounding shown.',
      communicationScore: typeof reportData.communicationScore === 'number' ? reportData.communicationScore : 75,
      communicationScoreExplanation: reportData.communicationScoreExplanation || 'Clear technical communication.',
      overallScore: typeof reportData.overallScore === 'number' ? reportData.overallScore : 75,
      strengths: Array.isArray(reportData.strengths) ? reportData.strengths : ['Fundamental concept mastery'],
      weakAreas: Array.isArray(reportData.weakAreas) ? reportData.weakAreas : [],
      suggestedAnswers: Array.isArray(reportData.suggestedAnswers) ? reportData.suggestedAnswers : [],
      followUpQuestions: Array.isArray(reportData.followUpQuestions) ? reportData.followUpQuestions : [],
      recommendation: reportData.recommendation || 'Solid foundational knowledge. Focus on practicing complex application examples.',
      turns: enrichedTurns,
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      report: finalReport,
    });
  } catch (error: any) {
    console.error('Viva generate report error:', error);
    res.status(500).json({ error: formatFriendlyError(error) });
  }
});

// Vite middleware for dev / static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Study Assistant server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
