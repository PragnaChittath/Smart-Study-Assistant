import { acquireGeminiEngine, executeInteractionCall } from '../aiClient.ts';

export interface TutorChatPayload {
  message?: string;
  messages?: Array<{ text: string; sender: string }>;
  studyContext?: any;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  audio?: {
    mimeType: string;
    data: string;
    duration?: number;
  };
  tutorLanguage?: {
    code: string;
    name: string;
    scriptType?: 'native' | 'romanized' | 'both';
  };
  studyLanguage?: string;
  studyLanguageCode?: string;
  inputLanguage?: string;
  inputLanguageCode?: string;
  outputLanguage?: string;
  outputLanguageCode?: string;
}

export class InteractiveTutorService {
  public static async answerStudentQuery(payload: TutorChatPayload): Promise<string> {
    const aiEngine = acquireGeminiEngine();
    const {
      message,
      messages,
      studyContext,
      history,
      audio,
      tutorLanguage,
      studyLanguage,
      outputLanguage,
      inputLanguage,
    } = payload;

    const targetLangName =
      outputLanguage || studyLanguage || tutorLanguage?.name || 'English';
    const scriptPreference = tutorLanguage?.scriptType || 'both';

    const systemInstruction = `You are Socrates & Feynman combined: an exceptionally warm, encouraging, pedagogical, and razor-sharp AI Academic Tutor.
Your goal is to guide students to deep intuitive understanding using the Feynman technique, intuitive analogies, step-by-step breakdowns, and active recall checks.

STUDY CONTEXT:
- Subject: ${studyContext?.title || 'Academic Notes'}
- High-level Overview: ${typeof studyContext?.summary === 'string' ? studyContext.summary : (studyContext?.summary?.highLevelOverview || '').slice(0, 3000)}
- Key Concepts: ${JSON.stringify(studyContext?.summary?.keyConcepts || []).slice(0, 2000)}
- Glossary: ${JSON.stringify(studyContext?.summary?.glossary || studyContext?.keyTerms || []).slice(0, 1500)}

PEDAGOGICAL GUIDELINES:
1. Ground answers in the provided study context while explaining the *underlying mechanism* with clarity and memorable real-world examples.
2. If the student asks a question in text or audio, answer warmly, clearly, and directly in ${targetLangName}.
3. If speaking in an Indian regional language (e.g. Telugu, Hindi, Tamil) or non-Latin script and scriptPreference is "romanized" or "both", provide clear Romanized transliteration alongside the native script for maximum accessibility.
4. Conclude your explanation with a gentle check-for-understanding question to stimulate active recall.`;

    const chatContents: any[] = [];

    // Add prior message turns if provided
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-6)) {
        chatContents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.parts?.[0]?.text || '' }],
        });
      }
    } else if (Array.isArray(messages) && messages.length > 1) {
      for (const msg of messages.slice(-7, -1)) {
        chatContents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || '' }],
        });
      }
    }

    // Determine current user query
    const latestQueryText =
      message || (Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.text : '') || 'Please explain this topic.';

    const userParts: any[] = [];

    if (audio && audio.data) {
      const cleanAudioBase64 = audio.data.replace(/^data:[^;]+;base64,/, '');
      userParts.push({
        inlineData: {
          mimeType: audio.mimeType || 'audio/webm',
          data: cleanAudioBase64,
        },
      });
      userParts.push({
        text: `The student spoke this voice question in ${inputLanguage || 'their native language'}. Listen to the audio, understand their question, and answer comprehensively in ${targetLangName}.`,
      });
    } else {
      userParts.push({
        text: latestQueryText,
      });
    }

    chatContents.push({
      role: 'user',
      parts: userParts,
    });

    const reply = await executeInteractionCall(aiEngine, {
      input: chatContents,
      systemInstruction,
      temperature: 0.5,
      primaryModel: 'gemini-3.1-flash-lite',
      fallbackModels: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash'],
    });

    return reply || 'I am ready to help you explore this topic further.';
  }
}
