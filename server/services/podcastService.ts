import { acquireGeminiEngine, executeResilientModelCall } from '../aiClient';

export class AudioPodcastService {
  public static async generateDialogueEpisode(payload: {
    studyContext: any;
    host1Language?: string;
    host1LanguageCode?: string;
    host2Language?: string;
    host2LanguageCode?: string;
    targetLanguage?: string;
  }) {
    const aiEngine = acquireGeminiEngine();
    const h1Lang = payload.host1Language || payload.targetLanguage || 'English';
    const h2Lang = payload.host2Language || payload.targetLanguage || 'English';
    const h1Code = payload.host1LanguageCode || 'en-US';
    const h2Code = payload.host2LanguageCode || 'en-US';

    const promptDirectives = `You are an award-winning educational audio producer creating a lively, high-yield dual-host podcast recap.
Write an authentic, fast-paced, insightful conversational dialogue breaking down the following study materials.

HOST CONFIGURATION:
- Host 1 (Alex - Curious Explorer): Asks intuitive questions, offers relatable analogies, provides enthusiastic commentary. Speaks in ${h1Lang}.
- Host 2 (Sam - Analytical Specialist): Explains core mechanisms with clarity, clarifies nuances, debunks common mistakes. Speaks in ${h2Lang}.

TOPIC TITLE: ${payload.studyContext?.title || 'Educational Subject'}
SUMMARY CONTEXT:
${(payload.studyContext?.summary?.highLevelOverview || payload.studyContext?.summary || '').slice(0, 5000)}

KEY TAKEAWAYS & CONCEPTS:
${JSON.stringify(payload.studyContext?.summary?.keyConcepts || payload.studyContext?.keyTerms || []).slice(0, 3000)}

SCRIPT REQUIREMENTS:
1. Generate 14 to 26 energetic dialogue lines alternating between Host 1 (Alex in ${h1Lang}) and Host 2 (Sam in ${h2Lang}).
2. Do not write stage directions, parentheticals, or asterisks inside the text field so SpeechSynthesis reads it fluently.
3. Keep sentences conversational, engaging, and pedagogically rich.
4. Conclude with a strong recap of practical applications.

You must return valid JSON with this exact structure:
{
  "episodeTitle": "Catchy Episode Title",
  "episodeTagline": "One-line engaging tagline",
  "durationEstimate": "4-5 mins",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "dialogue": [
    {
      "speaker": "Host 1",
      "speakerName": "Alex",
      "text": "Spoken line here without asterisks",
      "tone": "inquisitive",
      "keyPoint": "Intro concept"
    },
    {
      "speaker": "Host 2",
      "speakerName": "Sam",
      "text": "Response line explaining the core mechanics",
      "tone": "analytical",
      "keyPoint": "Mechanism explanation"
    }
  ]
}`;

    const executionResult = await executeResilientModelCall(
      aiEngine,
      () => ({
        contents: promptDirectives,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.45,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
    );

    const raw = executionResult.parsedJson || {};
    const normalizedDialogue = (raw.dialogue || []).map((line: any, idx: number) => {
      const isH1 = line.speaker === 'Host 1' || idx % 2 === 0;
      return {
        id: `pod_line_${Date.now()}_${idx + 1}`,
        speaker: (isH1 ? 'Host 1' : 'Host 2') as 'Host 1' | 'Host 2',
        speakerName: isH1 ? 'Alex' : 'Sam',
        text: line.text || 'Let us explore this fascinating concept.',
        tone: line.tone || (isH1 ? 'inquisitive' : 'analytical'),
        keyPoint: line.keyPoint || undefined,
        language: isH1 ? h1Lang : h2Lang,
        languageCode: isH1 ? h1Code : h2Code,
      };
    });

    return {
      episodeTitle: raw.episodeTitle || `${payload.studyContext?.title || 'Academic Topic'} in 5 Minutes`,
      episodeTagline: raw.episodeTagline || 'Dual-host interactive audio recap & deep dive.',
      durationEstimate: raw.durationEstimate || '4-5 mins',
      host1Language: h1Lang,
      host1LanguageCode: h1Code,
      host2Language: h2Lang,
      host2LanguageCode: h2Code,
      hosts: {
        host1: { name: 'Alex', role: 'Curious Explorer', language: h1Lang, languageCode: h1Code },
        host2: { name: 'Sam', role: 'Analytical Specialist', language: h2Lang, languageCode: h2Code },
      },
      dialogue: normalizedDialogue,
      keyTakeaways: Array.isArray(raw.keyTakeaways) && raw.keyTakeaways.length > 0
        ? raw.keyTakeaways
        : ['Core fundamentals understood', 'Practical applications explored', 'Exam readiness achieved'],
      generatedAt: new Date().toISOString(),
    };
  }
}
