import { VivaReport } from '../types';

const VIVA_STORAGE_KEY = 'smart_study_viva_history_v1';
const DB_NAME = 'SmartStudyAssistant_VivaDB';
const DB_VERSION = 1;
const STORE_NAME = 'viva_reports';

// Open IndexedDB for Viva Reports
function openVivaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all saved viva reports
export async function getSavedVivaReports(): Promise<VivaReport[]> {
  try {
    const db = await openVivaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        // Sort newest first
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      request.onerror = () => {
        resolve(getFallbackLocalStorageReports());
      };
    });
  } catch (e) {
    return getFallbackLocalStorageReports();
  }
}

// Fallback to localStorage
function getFallbackLocalStorageReports(): VivaReport[] {
  try {
    const raw = localStorage.getItem(VIVA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read viva reports from localStorage', e);
    return [];
  }
}

// Save a viva report
export async function saveVivaReport(report: VivaReport): Promise<void> {
  // 1. Save to IndexedDB
  try {
    const db = await openVivaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(report);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IndexedDB save failed, falling back to localStorage', e);
  }

  // 2. Safe mirror to localStorage (keep top 20 latest)
  try {
    const existing = getFallbackLocalStorageReports();
    const updated = [report, ...existing.filter((r) => r.id !== report.id)].slice(0, 20);
    localStorage.setItem(VIVA_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('localStorage save failed', e);
  }
}

// Delete a viva report
export async function deleteVivaReport(id: string): Promise<void> {
  try {
    const db = await openVivaDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (e) {}

  try {
    const existing = getFallbackLocalStorageReports();
    const updated = existing.filter((r) => r.id !== id);
    localStorage.setItem(VIVA_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
}

// Format Viva Report as Markdown for export
export function generateVivaReportMarkdown(report: VivaReport): string {
  const dateStr = new Date(report.createdAt).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let md = `# 🎤 Viva / Interview Performance Report: ${report.title}\n\n`;
  md += `**Date:** ${dateStr}  \n`;
  md += `**Subject:** ${report.subject}  \n`;
  md += `**Interview Type:** ${report.interviewType.replace('_', ' ').toUpperCase()}  \n`;
  md += `**Difficulty:** ${report.difficulty.toUpperCase()}  \n`;
  md += `**Language:** ${report.language} (${report.languageCode})  \n`;
  md += `**Duration:** ${Math.round(report.durationSeconds / 60)} minutes  \n`;
  md += `**Questions:** ${report.answeredQuestions} answered / ${report.totalQuestions} total (${report.skippedQuestions} skipped)\n\n`;

  md += `## 🏆 Overall Performance Summary\n\n`;
  md += `- **Overall Score:** ${report.overallScore}/100\n`;
  md += `- **📚 Knowledge Score:** ${report.knowledgeScore}/100 — ${report.knowledgeScoreExplanation}\n`;
  md += `- **🗣️ Communication Score:** ${report.communicationScore}/100 — ${report.communicationScoreExplanation}\n\n`;

  md += `## 🌟 Demonstrated Strengths\n\n`;
  report.strengths.forEach((s) => {
    md += `- ${s}\n`;
  });
  md += `\n`;

  if (report.weakAreas.length > 0) {
    md += `## ⚠️ Areas to Improve\n\n`;
    report.weakAreas.forEach((w, idx) => {
      md += `### ${idx + 1}. ${w.concept}\n`;
      md += `- **Observed Gap:** ${w.issue}\n`;
      md += `- **Recommended Action:** ${w.recommendedAction}\n\n`;
    });
  }

  if (report.suggestedAnswers.length > 0) {
    md += `## 💡 Model Suggested Answers for Weak Responses\n\n`;
    report.suggestedAnswers.forEach((sa, idx) => {
      md += `### Question ${idx + 1}: ${sa.question}\n`;
      md += `**Your Answer:** ${sa.userAnswer || '*(Skipped)*'}\n\n`;
      md += `**Suggested Model Answer:** ${sa.suggestedAnswer}\n\n`;
      md += `**What Was Missing:** ${sa.whatWasMissing}\n\n`;
      md += `---\n\n`;
    });
  }

  if (report.followUpQuestions.length > 0) {
    md += `## 🔄 Recommended Follow-Up Practice Questions\n\n`;
    report.followUpQuestions.forEach((q, idx) => {
      md += `${idx + 1}. ${q}\n`;
    });
    md += `\n`;
  }

  md += `## 📋 Recommendation & Roadmap\n\n`;
  md += `${report.recommendation}\n\n`;

  md += `## 📝 Detailed Question-by-Question Review\n\n`;
  report.turns.forEach((turn, idx) => {
    md += `### Question ${turn.questionNumber || idx + 1}\n\n`;
    md += `**AI Examiner:** ${turn.questionText}\n\n`;
    md += `**Your Answer:** ${turn.wasSkipped ? '*(Skipped)*' : turn.userAnswerText || '*(No answer provided)*'}\n\n`;
    if (turn.evaluation) {
      md += `**Evaluation:** ${turn.evaluation.status.toUpperCase()} (${turn.evaluation.score}/10)\n\n`;
      md += `**Knowledge Assessment:** ${turn.evaluation.knowledgeEvaluation}\n\n`;
      md += `**Communication Assessment:** ${turn.evaluation.communicationEvaluation}\n\n`;
      md += `**Model Answer:** ${turn.evaluation.suggestedAnswer}\n\n`;
      if (turn.evaluation.missingPoints && turn.evaluation.missingPoints.length > 0) {
        md += `**Key Missing Points:**\n`;
        turn.evaluation.missingPoints.forEach((mp) => {
          md += `- ${mp}\n`;
        });
        md += `\n`;
      }
      md += `**Improvement Tip:** ${turn.evaluation.improvementTip}\n\n`;
    }
    md += `---\n\n`;
  });

  return md;
}
