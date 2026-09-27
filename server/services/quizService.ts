import { acquireGeminiEngine, executeResilientModelCall } from '../aiClient';

export class AdaptiveQuizService {
  public static async generateAdditionalQuestions(payload: {
    studyContext: any;
    count?: number;
    studyLanguage?: string;
  }) {
    const aiEngine = acquireGeminiEngine();
    const count = payload.count || 5;
    const lang = payload.studyLanguage || 'English';

    const summaryStr =
      typeof payload.studyContext?.summary === 'string'
        ? payload.studyContext.summary
        : payload.studyContext?.summary?.highLevelOverview || '';

    const promptDirectives = `You are a standardized test author and curriculum assessment designer.
Generate ${count} fresh, rigorous, non-repetitive multiple choice questions based on the following study materials.

TOPIC: ${payload.studyContext?.title || 'Academic Concept'}
SUMMARY CONTEXT:
${summaryStr.slice(0, 4000)}

REQUIREMENTS:
1. Formulate exactly ${count} questions testing conceptual understanding, application, and critical edge cases.
2. Provide 4 plausible options for each question with exactly one correct answer (0-indexed).
3. Include an insightful explanation justifying the correct answer and debunking distractors.
4. Provide a helpful hint for students who need a clue.
5. Target Language: ${lang}.

You must return valid JSON strictly conforming to this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Thorough explanation of the correct choice",
      "hint": "Helpful subtle clue"
    }
  ]
}`;

    const executionResult = await executeResilientModelCall(
      aiEngine,
      () => ({
        contents: promptDirectives,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.35,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
    );

    const questionsList = executionResult.parsedJson?.questions || [];
    return questionsList.map((q: any, idx: number) => ({
      id: `q_extra_${Date.now()}_${idx + 1}`,
      question: q.question || `Question #${idx + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || 'Refer to the study guide for more details.',
      hint: q.hint || undefined,
    }));
  }
}
