import React, { useState } from 'react';
import { SummaryData } from '../types';
import {
  BookOpen,
  CheckCircle2,
  Bookmark,
  Search,
  Copy,
  Check,
  FileText,
  Lightbulb,
  Zap,
  GitCompare,
} from 'lucide-react';

interface SummaryViewProps {
  summary: SummaryData;
  sourceName?: string;
  onOpenComparison?: () => void;
  hasComparison?: boolean;
  isMultiFile?: boolean;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  summary,
  sourceName,
  onOpenComparison,
  hasComparison,
  isMultiFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredGlossary = summary.glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyMarkdown = () => {
    let md = `# ${summary.title}\n\n`;
    md += `## Overview\n${summary.highLevelOverview}\n\n`;
    md += `## Key Takeaways\n${summary.keyTakeaways.map((k) => `- ${k}`).join('\n')}\n\n`;
    md += `## Key Concepts\n${summary.keyConcepts.map((c) => `### ${c.topic}\n${c.details}`).join('\n\n')}\n\n`;
    md += `## Glossary\n${summary.glossary.map((g) => `- **${g.term}**: ${g.definition}`).join('\n')}\n`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getImportanceBadge = (importance?: string) => {
    switch (importance) {
      case 'high':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">High Priority</span>;
      case 'medium':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium</span>;
      case 'low':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">Low</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="space-y-1">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Executive Study Guide</span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">{summary.title}</h2>
          {sourceName && <p className="text-xs text-slate-400">Source: {sourceName}</p>}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
            <span>{copied ? 'Copied Markdown' : 'Copy Study Guide'}</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Callout Card (if multi-file) */}
      {onOpenComparison && (isMultiFile || hasComparison) && (
        <div>
          <div
            onClick={onOpenComparison}
            className="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-cyan-950/40 border border-indigo-500/30 hover:border-indigo-500/60 rounded-3xl p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-xl group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition shrink-0">
                <GitCompare className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-100 truncate">
                    {hasComparison ? 'Comparative Report Ready' : 'Compare Documents'}
                  </h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 shrink-0">
                    Side-by-Side
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  Similarities, distinct differences, contradiction analysis & markdown table.
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenComparison();
              }}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
            >
              {hasComparison ? 'View Matrix ➔' : 'Compare ➔'}
            </button>
          </div>
        </div>
      )}

      {/* Overview Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-3">
          <BookOpen className="w-4 h-4" />
          <span>High-Level Overview</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {summary.highLevelOverview}
        </p>
      </div>

      {/* Key Takeaways */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Key Takeaways & Core Concepts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.keyTakeaways.map((takeaway, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{takeaway}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Concepts Breakdown */}
      {summary.keyConcepts && summary.keyConcepts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-4">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
            <span>Deep Dive: Critical Topics</span>
          </div>

          <div className="space-y-3">
            {summary.keyConcepts.map((concept, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-bold text-slate-100">{concept.topic}</h4>
                  {getImportanceBadge(concept.importance)}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{concept.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulas or Principles if any */}
      {summary.formulasOrRules && summary.formulasOrRules.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-3">
            <Bookmark className="w-4 h-4 text-violet-400" />
            <span>Formulas, Equations & Rules</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {summary.formulasOrRules.map((formula, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs font-mono text-indigo-200"
              >
                {formula}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Terms Glossary */}
      {summary.glossary && summary.glossary.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <FileText className="w-4 h-4" />
              <span>Key Terms Glossary ({summary.glossary.length})</span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search glossary term..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredGlossary.map((g, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between"
              >
                <div>
                  <h5 className="text-xs font-bold text-indigo-300 mb-1">{g.term}</h5>
                  <p className="text-xs text-slate-300">{g.definition}</p>
                </div>
                {g.example && (
                  <p className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 italic">
                    Example: {g.example}
                  </p>
                )}
              </div>
            ))}
            {filteredGlossary.length === 0 && (
              <p className="text-xs text-slate-400 col-span-2 text-center py-4">
                No glossary terms match "{searchTerm}".
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
