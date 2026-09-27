import { Type } from '@google/genai';
import { acquireGeminiEngine, executeResilientModelCall } from '../aiClient.ts';

export const mindmapSchemaDefinition = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    overview: { type: Type.STRING, description: 'Short overview of the concept structure' },
    mermaidSyntax: {
      type: Type.STRING,
      description: 'Clean, valid Mermaid flowchart syntax (starting with "flowchart TD" or "flowchart LR") with well-styled nodes and clusters',
    },
    keyThemes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          theme: { type: Type.STRING },
          description: { type: Type.STRING },
          subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['theme', 'description'],
      },
    },
  },
  required: ['title', 'mermaidSyntax', 'keyThemes'],
};

export class ConceptDiagramService {
  public static async synthesizeDiagram(payload: {
    studyContext: any;
    layoutStyle?: 'flowchart-td' | 'flowchart-lr';
  }) {
    const aiEngine = acquireGeminiEngine();
    const layout = payload.layoutStyle || 'flowchart-td';
    const direction = layout === 'flowchart-lr' ? 'LR' : 'TD';

    const title = payload.studyContext?.title || 'Academic Concept';
    const summaryText =
      typeof payload.studyContext?.summary === 'string'
        ? payload.studyContext.summary
        : payload.studyContext?.summary?.highLevelOverview || '';

    const promptDirectives = `You are a visual knowledge graph architect and technical information designer.
Synthesize a comprehensive, beautiful, valid Mermaid.js flowchart mapping the complete conceptual hierarchy of this topic.

TOPIC: ${title}
SUMMARY CONTEXT:
${summaryText.slice(0, 4500)}

DIAGRAM SYNTAX RULES:
1. Start with "flowchart ${direction}".
2. Root node: root["${title.replace(/["\n\r]/g, ' ')}"]
3. Branch into 3 to 6 major thematic clusters.
4. From each theme, branch into 2 to 4 concrete subtopics, mechanisms, or principles.
5. Use alphanumeric node IDs with NO special characters (e.g., root, theme1, sub1_1).
6. Enclose all label text in quotes: node_id["Clear Short Label"].
7. Avoid parenthesis, brackets, or nested quotes inside labels that could break the Mermaid parser.
8. Add aesthetic classDef styles:
   classDef rootStyle fill:#4338ca,stroke:#818cf8,stroke-width:3px,color:#ffffff,font-weight:bold;
   classDef themeStyle fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff,font-weight:bold;
   classDef subStyle fill:#0f172a,stroke:#38bdf8,stroke-width:1px,color:#f8fafc;
   class root rootStyle;

You must return valid JSON with this exact structure:
{
  "title": "${title.replace(/"/g, "'")}",
  "overview": "Short architectural overview",
  "mermaidSyntax": "flowchart ${direction}\\n  root[...]",
  "keyThemes": [
    { "theme": "...", "description": "...", "subtopics": ["..."] }
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

    const raw = executionResult.parsedJson || {};
    return {
      title: raw.title || title,
      overview: raw.overview || 'Concept hierarchy map',
      mermaidSyntax: raw.mermaidSyntax || `flowchart ${direction}\n  root["${title.replace(/"/g, "'")}"]\n  root --> sub1["Overview"]\n  root --> sub2["Key Concepts"]`,
      layoutStyle: layout,
      keyThemes: Array.isArray(raw.keyThemes) && raw.keyThemes.length > 0
        ? raw.keyThemes
        : [
            { theme: 'Core Overview', description: 'Foundational principles', subtopics: ['Definitions', 'Key Mechanisms'] },
            { theme: 'Applications', description: 'Practical implementations', subtopics: ['Use Cases', 'Best Practices'] },
          ],
      generatedAt: new Date().toISOString(),
    };
  }
}
