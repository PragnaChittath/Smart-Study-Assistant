import { acquireGeminiEngine, executeResilientModelCall } from '../aiClient';

export class ComparativeMatrixService {
  public static async executeComparison(payload: {
    studyContext: any;
    focus?: string;
  }) {
    const aiEngine = acquireGeminiEngine();
    const { studyContext, focus } = payload;

    const summaryStr =
      typeof studyContext?.summary === 'string'
        ? studyContext.summary
        : studyContext?.summary?.highLevelOverview || '';

    const sourceContextText = `Title: ${studyContext?.title || 'Study Material'}
Sources: ${(studyContext?.sourceFiles || []).join(', ') || 'Uploaded Materials'}
Summary Excerpt:
${summaryStr}

Raw Context Excerpt:
${(studyContext?.rawTextSnippet || '').slice(0, 10000)}`;

    const promptDirectives = `You are a senior academic peer reviewer and comparative document analyst.
Perform an in-depth, rigorous multi-source comparative intelligence analysis across the provided study documents and uploaded sources.

${focus ? `CRITICAL SPECIFIC FOCUS LENS:\n"${focus}"\n` : ''}

INSPECTION OBJECTIVES:
1. Executive Overview: Synthesize how the documents relate, whether they corroborate each other, build sequentially, or represent alternative methodologies.
2. Key Similarities: Detail 4 to 8 shared foundational principles, overlapping concepts, or matching conclusions.
3. Distinct Differences: Detail 4 to 8 divergent areas, differences in scope, mathematical derivations, or specific emphasis.
4. Contradicting Statements: Detect any explicit discrepancies, conflicting dates, opposing claims, or differing definitions. For each, attribute statements to Source A vs Source B and provide reconciliation analysis.
5. Markdown Comparison Table: Construct an exhaustive Markdown table with columns: | Dimension / Criterion | Source A Perspective | Source B Perspective | Synthesis / Resolution |.
6. Synthesized Takeaway: Provide actionable summary guidance integrating all perspectives into a unified mental model.

SOURCE MATERIALS:
${sourceContextText}

You must return valid JSON with this exact structure:
{
  "title": "Comparative Analysis: ${studyContext?.title || 'Documents'}",
  "overview": "Detailed executive synthesis",
  "comparedFiles": ["Source Document A", "Source Document B"],
  "keySimilarities": ["Similarity 1", "Similarity 2"],
  "distinctDifferences": ["Difference 1", "Difference 2"],
  "contradictingStatements": [
    {
      "claim": "The point of dispute",
      "sourceA": { "sourceName": "Doc 1", "statement": "Assertion in doc 1" },
      "sourceB": { "sourceName": "Doc 2", "statement": "Assertion in doc 2" },
      "analysis": "Reconciliation insight"
    }
  ],
  "markdownTable": "| Dimension | Source A | Source B | Synthesis |\\n|---|---|---|---|",
  "synthesizedTakeaway": "Unified takeaway summary"
}`;

    const executionResult = await executeResilientModelCall(
      aiEngine,
      () => ({
        contents: promptDirectives,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
      'gemini-3.1-flash-lite',
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
    );

    const raw = executionResult.parsedJson || {};
    return {
      title: raw.title || `Comparative Analysis: ${studyContext?.title || 'Documents'}`,
      overview: raw.overview || 'Detailed comparative synthesis across sources.',
      comparedFiles: Array.isArray(raw.comparedFiles) && raw.comparedFiles.length > 0
        ? raw.comparedFiles
        : studyContext?.sourceFiles || ['Source Document A', 'Source Document B'],
      keySimilarities: Array.isArray(raw.keySimilarities) ? raw.keySimilarities : [],
      distinctDifferences: Array.isArray(raw.distinctDifferences) ? raw.distinctDifferences : [],
      contradictingStatements: Array.isArray(raw.contradictingStatements) ? raw.contradictingStatements : [],
      markdownTable: raw.markdownTable || '| Criterion | Source A | Source B | Synthesis |\n|---|---|---|---|',
      synthesizedTakeaway: raw.synthesizedTakeaway || 'Both documents contribute complementary insights into the subject matter.',
      generatedAt: new Date().toISOString(),
    };
  }
}
