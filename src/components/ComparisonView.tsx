import React, { useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Table as TableIcon,
  Layers,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  Info,
  Maximize2,
  Sliders,
  BookOpen,
  Share2,
  Flame,
  HelpCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ComparisonData, StudySet } from '../types';

interface ComparisonViewProps {
  studySet: StudySet;
  onUpdateStudySet?: (updated: StudySet) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ studySet, onUpdateStudySet }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'all' | 'table' | 'contradictions' | 'dimensions'>('all');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [customFocus, setCustomFocus] = useState('');
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [selectedContradictionIndex, setSelectedContradictionIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const comparison = studySet.comparison;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleGenerateOrRefreshComparison = async (focusText?: string) => {
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/compare-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyContext: {
            title: studySet.title,
            sourceFiles: studySet.sourceFiles || [studySet.sourceName],
            summary: studySet.summary,
            rawTextSnippet: studySet.rawTextSnippet,
          },
          focus: focusText || customFocus || undefined,
        }),
      });

      const result = await response.json();
      if (result.success && result.comparison) {
        const updatedSet: StudySet = {
          ...studySet,
          comparison: result.comparison,
        };
        if (onUpdateStudySet) {
          onUpdateStudySet(updatedSet);
        }
        setShowFocusModal(false);
      } else {
        setErrorMessage(result.error || 'Failed to generate comparative analysis.');
        setTimeout(() => setErrorMessage(null), 6000);
      }
    } catch (err: any) {
      console.error('Error generating comparison:', err);
      setErrorMessage('Failed to connect to comparison service. Please check your network or try again.');
      setTimeout(() => setErrorMessage(null), 6000);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!comparison) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <GitCompare className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-slate-100 mb-2">Side-by-Side Comparative Analysis</h3>
        <p className="text-slate-400 text-sm max-w-xl mx-auto mb-6">
          Compare key similarities, distinct differences, contradictory claims, and unified takeaways across your uploaded documents and images in a neat structured table.
        </p>

        {studySet.sourceFiles && studySet.sourceFiles.length >= 2 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg mx-auto text-left mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Detected Sources ({studySet.sourceFiles.length})
            </h4>
            <div className="space-y-2">
              {studySet.sourceFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate font-medium">{file}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {errorMessage && (
          <div className="p-3.5 max-w-lg mx-auto mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 ml-2 font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        <button
          onClick={() => handleGenerateOrRefreshComparison()}
          disabled={isRegenerating}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
        >
          {isRegenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing & Synthesizing Documents...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run Comparative Analysis Now</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const comparedFiles = comparison.comparedFiles || studySet.sourceFiles || ['Source 1', 'Source 2'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-indigo-500/20 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Structured Side-by-Side Analysis</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {comparison.title || 'Document & Image Comparison'}
            </h2>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 pt-1">
              <span>Compared Sources:</span>
              {comparedFiles.map((file, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-200 font-medium"
                >
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span className="max-w-[200px] truncate">{file}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => handleCopy(comparison.markdownTable, 'table')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              {copied === 'table' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied === 'table' ? 'Table Copied!' : 'Copy Table'}</span>
            </button>

            <button
              onClick={() => setShowFocusModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Refine Focus</span>
            </button>

            <button
              onClick={() => handleGenerateOrRefreshComparison()}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>{isRegenerating ? 'Re-analyzing...' : 'Refresh Analysis'}</span>
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 mt-6 border-t border-slate-800/80 pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveViewMode('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeViewMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Full Comparison View
          </button>
          <button
            onClick={() => setActiveViewMode('table')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeViewMode === 'table'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Comparison Table
          </button>
          <button
            onClick={() => setActiveViewMode('contradictions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeViewMode === 'contradictions'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-rose-300 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Contradictions & Discrepancies ({comparison.contradictingStatements?.length || 0})
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 ml-2 font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Focus Refinement Modal */}
      {showFocusModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Refine Comparative Analysis Focus
              </h3>
              <button
                onClick={() => setShowFocusModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Instruct Gemini to spotlight a specific analytical angle across your documents (e.g. theoretical discrepancies, mathematical derivations, clinical differences, or timeline variations).
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Custom Focus Prompt / Lens</label>
              <textarea
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder="e.g., Focus on conflicting definitions of entropy and differing experimental setups between Chapter 3 and Lecture 4..."
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFocusModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerateOrRefreshComparison(customFocus)}
                disabled={isRegenerating}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isRegenerating ? 'Analyzing...' : 'Generate Refined Comparison'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executive Overview */}
      {(activeViewMode === 'all' || activeViewMode === 'table') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" /> Executive Comparative Overview
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
            {comparison.overview}
          </p>
        </div>
      )}

      {/* Side-by-Side Key Similarities & Distinct Differences (Grid) */}
      {activeViewMode === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Similarities */}
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Key Similarities &amp; Shared Foundations
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  {comparison.keySimilarities?.length || 0} Points
                </span>
              </div>
              <ul className="space-y-2.5">
                {comparison.keySimilarities?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Distinct Differences */}
          <div className="bg-slate-900 border border-cyan-500/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Distinct Differences &amp; Divergent Scopes
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  {comparison.distinctDifferences?.length || 0} Divergences
                </span>
              </div>
              <ul className="space-y-2.5">
                {comparison.distinctDifferences?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Contradicting Statements & Discrepancies Alert Section */}
      {(activeViewMode === 'all' || activeViewMode === 'contradictions') && (
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-200">
                  Contradicting Statements &amp; Conceptual Discrepancies
                </h3>
                <p className="text-xs text-rose-400/80">
                  Direct conflicts, opposing claims, and conflicting assertions identified between compared sources
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300">
              {comparison.contradictingStatements?.length || 0} Conflicts Identified
            </span>
          </div>

          {comparison.contradictingStatements && comparison.contradictingStatements.length > 0 ? (
            <div className="space-y-4 pt-2">
              {comparison.contradictingStatements.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-950/80 border border-rose-500/20 p-4 space-y-3 transition hover:border-rose-500/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 text-[10px] uppercase font-mono">
                        Conflict #{idx + 1}
                      </span>
                      {item.claim}
                    </span>
                  </div>

                  {/* Side by side statement comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {item.sourceA?.sourceName || comparedFiles[0] || 'Source A'}
                      </div>
                      <p className="text-slate-300 italic">"{item.sourceA?.statement}"</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {item.sourceB?.sourceName || comparedFiles[1] || 'Source B'}
                      </div>
                      <p className="text-slate-300 italic">"{item.sourceB?.statement}"</p>
                    </div>
                  </div>

                  {/* Critical resolution analysis */}
                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200">
                    <span className="font-semibold text-indigo-300">Analytical Reconciliation: </span>
                    {item.analysis}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>No major contradictory statements were detected across these materials; the sources appear complementary.</span>
            </div>
          )}
        </div>
      )}

      {/* Structured Markdown Comparison Table */}
      {(activeViewMode === 'all' || activeViewMode === 'table') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-base font-bold text-slate-100">Structured Markdown Comparison Table</h3>
                <p className="text-xs text-slate-400">Side-by-side dimensional matrix comparing core topics and consensus</p>
              </div>
            </div>
            <button
              onClick={() => handleCopy(comparison.markdownTable, 'markdown-table')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              {copied === 'markdown-table' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'markdown-table' ? 'Copied Markdown!' : 'Copy Markdown'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="markdown-comparison-table prose prose-invert max-w-none text-xs sm:text-sm">
              <ReactMarkdown>{comparison.markdownTable}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Consolidated Synthesized Takeaway */}
      {activeViewMode === 'all' && (
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-cyan-950/30 border border-indigo-500/30 rounded-2xl p-6 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">Consolidated Synthesized Takeaway</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
            {comparison.synthesizedTakeaway}
          </p>
        </div>
      )}
    </div>
  );
};
