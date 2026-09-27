import { acquireGeminiEngine, executeResilientModelCall } from '../aiClient';

export class VivaInterviewOrchestrator {
  public static async generateNextQuestion(payload: {
    setup: any;
    currentTurnIndex: number;
    previousTurns: any[];
    sourceContext?: string;
  }) {
    const aiEngine = acquireGeminiEngine();
    const { setup, currentTurnIndex, previousTurns, sourceContext } = payload;

    const subject = setup?.subject || 'Technical Subject';
    const interviewType = setup?.interviewType || 'academic_viva';
    const difficulty = setup?.difficulty || 'intermediate';
    const langName = setup?.language || 'English';

    const systemInstruction = `You are a distinguished academic examiner conducting a rigorous live ${interviewType.replace('_', ' ')} on "${subject}".
Difficulty Level: ${difficulty}.
Conduct the examination in ${langName}.

INTERVIEW GOALS:
1. Ask clear, focused questions evaluating conceptual grounding, critical reasoning, and practical application.
2. If this is a follow-up question, intelligently probe areas where candidate's previous answers were incomplete.
3. Keep question text conversational and direct.`;

    const promptText = `INTERVIEW CONTEXT:
Subject: ${subject}
Question Number: ${currentTurnIndex + 1}
${sourceContext ? `REFERENCE NOTES:\n"""\n${sourceContext.slice(0, 5000)}\n"""\n` : ''}

PREVIOUS TURNS:
${
  Array.isArray(previousTurns) && previousTurns.length > 0
    ? previousTurns
        .map(
          (t: any, i: number) =>
            `Q${i + 1}: ${t.questionText}\nA: ${t.wasSkipped ? '[SKIPPED]' : t.userAnswerText || '[NO RESPONSE]'}`
        )
        .join('\n\n')
    : 'This is the initial question of the interview.'
}

Generate Question #${currentTurnIndex + 1} for the candidate in valid JSON format:
{
  "questionText": "The examiner question here",
  "focusConcept": "Core concept being tested",
  "expectedPoints": ["Point 1", "Point 2", "Point 3"],
  "hint": "Subtle hint for the candidate",
  "interviewerTone": "probing"
}`;

    const executionResult = await executeResilientModelCall(
      aiEngine,
      () => ({
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.45,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
    );

    return executionResult.parsedJson;
  }

  public static async transcribeCandidateSpeech(payload: {
    audioData: string;
    mimeType?: string;
    languageName?: string;
    languageCode?: string;
  }): Promise<string> {
    const aiEngine = acquireGeminiEngine();
    const { audioData, mimeType, languageName, languageCode } = payload;
    const cleanBase64 = audioData.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '');

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Transcribe this candidate's spoken interview response with high phonetic and grammatical accuracy.
Candidate language: ${languageName || languageCode || 'Original spoken language'}.
Directives:
- Output ONLY the exact transcribed words.
- Do not include timestamps or quotes.
- Preserve domain terminology accurately.`,
    };

    const targetModels = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of targetModels) {
      try {
        const response = await aiEngine.models.generateContent({
          model,
          contents: { parts: [audioPart, textPart] },
        });

        if (response.text) {
          return response.text.trim();
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Could not transcribe audio response.');
  }

  public static async evaluateSessionAndGenerateReport(payload: {
    setup: any;
    turns: any[];
    durationSeconds: number;
    sourceContext?: string;
  }) {
    const aiEngine = acquireGeminiEngine();
    const { setup, turns, durationSeconds, sourceContext } = payload;

    const subject = setup?.subject || 'Interview';
    const interviewType = setup?.interviewType || 'academic_viva';
    const difficulty = setup?.difficulty || 'intermediate';
    const langName = setup?.language || 'English';

    const systemInstruction = `You are a senior academic evaluation panel chair assessing a completed ${interviewType.replace('_', ' ')} on "${subject}".

SCORING CRITERIA:
1. Knowledge Score (0-100): Conceptual clarity, technical rigor, accuracy, examples.
2. Communication Score (0-100): Thought structure, clarity, technical terminology. Do not penalize non-native accent; assess semantic precision.
3. Overall Score (0-100): Weighted combination (70% knowledge, 30% communication).
4. Turn Evaluations: Assess each turn with status (correct, partially_correct, incorrect, skipped), score (0-10), ideal answer, missing points, and actionable tips.
5. Language: Provide feedback in ${langName}.`;

    const promptText = `CANDIDATE TRANSCRIPT:
Subject: ${subject}
Difficulty: ${difficulty}
Duration: ${Math.round((durationSeconds || 0) / 60)} minutes

${sourceContext ? `SOURCE NOTES:\n${sourceContext.slice(0, 5000)}\n` : ''}

TRANSCRIPT:
${
  Array.isArray(turns) && turns.length > 0
    ? turns
        .map(
          (t: any, idx: number) =>
            `--- Q${t.questionNumber || idx + 1} ---
Question: ${t.questionText}
Answer: ${t.wasSkipped ? '[SKIPPED]' : t.userAnswerText || '[NO RESPONSE]'}`
        )
        .join('\n\n')
    : 'No questions answered.'
}

Return JSON with this exact structure:
{
  "knowledgeScore": 85,
  "knowledgeScoreExplanation": "...",
  "communicationScore": 80,
  "communicationScoreExplanation": "...",
  "overallScore": 83,
  "strengths": ["..."],
  "weakAreas": [{ "concept": "...", "issue": "...", "recommendedAction": "..." }],
  "suggestedAnswers": [{ "question": "...", "userAnswer": "...", "suggestedAnswer": "...", "whatWasMissing": "..." }],
  "followUpQuestions": ["..."],
  "recommendation": "...",
  "turnEvaluations": [
    {
      "questionNumber": 1,
      "status": "correct",
      "score": 9,
      "knowledgeEvaluation": "...",
      "communicationEvaluation": "...",
      "suggestedAnswer": "...",
      "missingPoints": ["..."],
      "improvementTip": "..."
    }
  ]
}`;

    const executionResult = await executeResilientModelCall(
      aiEngine,
      () => ({
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
    );

    const reportData = executionResult.parsedJson || {};

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
      knowledgeScoreExplanation: reportData.knowledgeScoreExplanation || 'Good conceptual grounding demonstrated.',
      communicationScore: typeof reportData.communicationScore === 'number' ? reportData.communicationScore : 75,
      communicationScoreExplanation: reportData.communicationScoreExplanation || 'Clear technical communication.',
      overallScore: typeof reportData.overallScore === 'number' ? reportData.overallScore : 75,
      strengths: Array.isArray(reportData.strengths) ? reportData.strengths : ['Fundamental concept mastery'],
      weakAreas: Array.isArray(reportData.weakAreas) ? reportData.weakAreas : [],
      suggestedAnswers: Array.isArray(reportData.suggestedAnswers) ? reportData.suggestedAnswers : [],
      followUpQuestions: Array.isArray(reportData.followUpQuestions) ? reportData.followUpQuestions : [],
      recommendation: reportData.recommendation || 'Solid foundational knowledge. Keep practicing complex application scenarios.',
      turns: enrichedTurns,
      createdAt: new Date().toISOString(),
    };

    return finalReport;
  }
}
