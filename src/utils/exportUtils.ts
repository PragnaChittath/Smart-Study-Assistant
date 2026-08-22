import { StudySet } from '../types';

export function generateMarkdownExport(studySet: StudySet): string {
  let md = `# ${studySet.title}\n\n`;
  md += `*Generated on ${studySet.createdAt}*\n`;
  if (studySet.sourceName) {
    md += `*Source Material: ${studySet.sourceName}*\n`;
  }
  md += `\n---\n\n`;

  // 1. SUMMARY
  md += `## Summary\n\n`;
  md += `${studySet.summary.highLevelOverview}\n\n`;

  if (studySet.summary.keyTakeaways && studySet.summary.keyTakeaways.length > 0) {
    md += `### Core Takeaways\n\n`;
    studySet.summary.keyTakeaways.forEach((k) => {
      md += `- ${k}\n`;
    });
    md += `\n`;
  }

  if (studySet.summary.keyConcepts && studySet.summary.keyConcepts.length > 0) {
    md += `### Core Concepts & Topics\n\n`;
    studySet.summary.keyConcepts.forEach((c) => {
      md += `- **${c.topic}** ${c.importance ? `(${c.importance.toUpperCase()} Priority)` : ''}: ${c.details}\n\n`;
    });
  }

  if (studySet.summary.formulasOrRules && studySet.summary.formulasOrRules.length > 0) {
    md += `### Principles & Formulas\n\n`;
    studySet.summary.formulasOrRules.forEach((f) => {
      md += `- \`${f}\`\n`;
    });
    md += `\n`;
  }

  if (studySet.summary.glossary && studySet.summary.glossary.length > 0) {
    md += `### Terminology Glossary\n\n`;
    studySet.summary.glossary.forEach((g) => {
      md += `- **${g.term}**: ${g.definition}${g.example ? ` *(Example: ${g.example})*` : ''}\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;

  // 2. CONCEPT DIAGRAM
  md += `## Concept Diagram\n\n`;
  if (studySet.mindMap) {
    if (studySet.mindMap.title) {
      md += `*${studySet.mindMap.title}*\n\n`;
    }
    if (studySet.mindMap.overview) {
      md += `${studySet.mindMap.overview}\n\n`;
    }
    md += `\`\`\`mermaid\n${studySet.mindMap.mermaidSyntax}\n\`\`\`\n\n`;
  } else {
    md += `*Concept diagram can be generated interactively within the study workspace.*\n\n`;
  }

  md += `---\n\n`;

  // 3. MINI PODCAST
  md += `## Mini Podcast\n\n`;
  if (studySet.podcast) {
    md += `**Episode Title:** ${studySet.podcast.episodeTitle}\n\n`;
    if (studySet.podcast.episodeTagline) {
      md += `*${studySet.podcast.episodeTagline}*\n\n`;
    }
    if (studySet.podcast.durationEstimate) {
      md += `*Estimated Duration: ~${studySet.podcast.durationEstimate} | Language: ${studySet.podcast.language || 'English'}*\n\n`;
    }

    if (studySet.podcast.keyTakeaways && studySet.podcast.keyTakeaways.length > 0) {
      md += `### Discussion Highlights\n\n`;
      studySet.podcast.keyTakeaways.forEach((t) => {
        md += `- ${t}\n`;
      });
      md += `\n`;
    }

    md += `### Dialogue Transcript\n\n`;
    studySet.podcast.dialogue.forEach((line) => {
      md += `**${line.speakerName}** ${line.tone ? `*(${line.tone})*` : ''}: "${line.text}"\n\n`;
    });
  } else {
    md += `*Podcast episode audio and script can be synthesized on demand in the study workspace.*\n\n`;
  }

  md += `---\n\n`;

  // 4. FLASHCARDS
  md += `## Flashcards\n\n`;
  if (studySet.flashcards && studySet.flashcards.length > 0) {
    md += `| # | Question / Prompt | Answer / Definition | Category |\n`;
    md += `|---|---|---|---|\n`;
    studySet.flashcards.forEach((fc, idx) => {
      const cleanFront = fc.front.replace(/\|/g, '-').replace(/\n/g, ' ');
      const cleanBack = fc.back.replace(/\|/g, '-').replace(/\n/g, ' ');
      md += `| ${idx + 1} | ${cleanFront} | ${cleanBack} | ${fc.category || 'General'} |\n`;
    });
    md += `\n`;
  } else {
    md += `*No flashcards created for this study set.*\n\n`;
  }

  md += `---\n\n`;

  // 5. QUIZ
  md += `## Quiz\n\n`;
  if (studySet.quiz && studySet.quiz.length > 0) {
    const optionLetters = ['A', 'B', 'C', 'D', 'E'];
    studySet.quiz.forEach((q, idx) => {
      md += `### Question ${idx + 1}\n\n${q.question}\n\n`;
      q.options.forEach((opt, optIdx) => {
        md += `- **${optionLetters[optIdx]}**: ${opt}\n`;
      });
      if (q.hint) {
        md += `\n*Hint: ${q.hint}*\n`;
      }
      md += `\n`;
    });

    md += `### Answer Key & Explanations\n\n`;
    studySet.quiz.forEach((q, idx) => {
      const correctLetter = optionLetters[q.correctAnswerIndex] || 'A';
      const correctText = q.options[q.correctAnswerIndex] || '';
      md += `${idx + 1}. **${correctLetter} (${correctText})** — ${q.explanation}\n`;
    });
    md += `\n`;
  } else {
    md += `*No quiz questions available for this study set.*\n\n`;
  }

  return md;
}

export function generateTextExport(studySet: StudySet): string {
  let txt = `====================================================\n`;
  txt += `${studySet.title.toUpperCase()}\n`;
  txt += `Generated: ${studySet.createdAt}\n`;
  if (studySet.sourceName) txt += `Source: ${studySet.sourceName}\n`;
  txt += `====================================================\n\n`;

  // 1. SUMMARY
  txt += `--- SUMMARY ---\n`;
  txt += `${studySet.summary.highLevelOverview}\n\n`;

  if (studySet.summary.keyTakeaways?.length) {
    txt += `Key Takeaways:\n`;
    studySet.summary.keyTakeaways.forEach((k, idx) => {
      txt += `  ${idx + 1}. ${k}\n`;
    });
    txt += `\n`;
  }

  if (studySet.summary.keyConcepts?.length) {
    txt += `Key Concepts:\n`;
    studySet.summary.keyConcepts.forEach((c, idx) => {
      txt += `  [${idx + 1}] ${c.topic} (${(c.importance || 'STANDARD').toUpperCase()})\n`;
      txt += `      ${c.details}\n\n`;
    });
  }

  if (studySet.summary.glossary?.length) {
    txt += `Glossary:\n`;
    studySet.summary.glossary.forEach((g) => {
      txt += `  * ${g.term}: ${g.definition}\n`;
      if (g.example) txt += `    Example: ${g.example}\n`;
    });
    txt += `\n`;
  }

  // 2. CONCEPT DIAGRAM
  txt += `--- CONCEPT DIAGRAM ---\n`;
  if (studySet.mindMap) {
    if (studySet.mindMap.title) txt += `Title: ${studySet.mindMap.title}\n`;
    if (studySet.mindMap.overview) txt += `Overview: ${studySet.mindMap.overview}\n\n`;
    txt += `Mermaid Diagram Syntax:\n${studySet.mindMap.mermaidSyntax}\n\n`;
  } else {
    txt += `(Concept diagram generated on demand)\n\n`;
  }

  // 3. MINI PODCAST
  txt += `--- MINI PODCAST ---\n`;
  if (studySet.podcast) {
    txt += `Episode: ${studySet.podcast.episodeTitle}\n`;
    if (studySet.podcast.episodeTagline) txt += `Tagline: ${studySet.podcast.episodeTagline}\n`;
    txt += `Duration: ~${studySet.podcast.durationEstimate}\n\n`;
    txt += `Transcript:\n`;
    studySet.podcast.dialogue.forEach((line) => {
      txt += `  ${line.speakerName}: "${line.text}"\n`;
    });
    txt += `\n`;
  } else {
    txt += `(Podcast episode synthesized on demand)\n\n`;
  }

  // 4. FLASHCARDS
  txt += `--- FLASHCARDS ---\n`;
  if (studySet.flashcards?.length) {
    studySet.flashcards.forEach((fc, idx) => {
      txt += `[Card ${idx + 1}] (${fc.category || 'General'})\n`;
      txt += `  Q: ${fc.front}\n`;
      txt += `  A: ${fc.back}\n\n`;
    });
  } else {
    txt += `(No flashcards)\n\n`;
  }

  // 5. QUIZ
  txt += `--- QUIZ ---\n`;
  if (studySet.quiz?.length) {
    const optionLetters = ['A', 'B', 'C', 'D', 'E'];
    studySet.quiz.forEach((q, idx) => {
      txt += `Q${idx + 1}: ${q.question}\n`;
      q.options.forEach((opt, optIdx) => {
        txt += `   ${optionLetters[optIdx]}) ${opt}\n`;
      });
      txt += `\n`;
    });

    txt += `Answer Key:\n`;
    studySet.quiz.forEach((q, idx) => {
      const correctLetter = optionLetters[q.correctAnswerIndex] || 'A';
      txt += `  Q${idx + 1}: ${correctLetter} - ${q.explanation}\n`;
    });
  } else {
    txt += `(No quiz questions)\n`;
  }

  return txt;
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

