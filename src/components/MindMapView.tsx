import React, { useState, useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import { StudySet, MindMapData } from '../types';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Download,
  Copy,
  Check,
  Code2,
  Layers,
  FileImage,
  ArrowDownUp,
  ArrowLeftRight,
  Info,
  ChevronDown,
  ChevronUp,
  Move,
  Layout,
  ExternalLink,
} from 'lucide-react';

interface MindMapViewProps {
  studySet: StudySet;
  onUpdateStudySet: (updatedSet: StudySet) => void;
}

// Fallback diagram builder in case syntax needs guaranteed recovery
const buildFallbackMermaid = (title: string, themes: Array<{ theme: string; description: string; subtopics?: string[] }>): string => {
  let lines: string[] = ['flowchart TD'];
  const safeRoot = title.replace(/["\n\r]/g, "'");
  lines.push(`  root["🚀 ${safeRoot}"]`);

  themes.slice(0, 5).forEach((t, i) => {
    const tId = `theme${i + 1}`;
    const safeTheme = t.theme.replace(/["\n\r]/g, "'");
    lines.push(`  root --> ${tId}["📌 ${safeTheme}"]`);

    if (t.subtopics && t.subtopics.length > 0) {
      t.subtopics.slice(0, 3).forEach((sub, j) => {
        const sId = `sub_${i + 1}_${j + 1}`;
        const safeSub = sub.replace(/["\n\r]/g, "'");
        lines.push(`  ${tId} --> ${sId}["🔹 ${safeSub}"]`);
      });
    }
  });

  lines.push('  classDef rootStyle fill:#4338ca,stroke:#818cf8,stroke-width:3px,color:#ffffff,font-weight:bold;');
  lines.push('  classDef themeStyle fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff,font-weight:bold;');
  lines.push('  classDef subStyle fill:#0f172a,stroke:#38bdf8,stroke-width:1px,color:#f8fafc;');
  lines.push('  class root rootStyle;');
  lines.push('  class theme1,theme2,theme3,theme4,theme5 themeStyle;');

  return lines.join('\n');
};

export const MindMapView: React.FC<MindMapViewProps> = ({
  studySet,
  onUpdateStudySet,
}) => {
  const mindMap = studySet.mindMap;

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<'flowchart-td' | 'flowchart-lr'>('flowchart-td');

  // Render & Canvas state
  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // UI state
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [customSyntax, setCustomSyntax] = useState(mindMap?.mermaidSyntax || '');
  const [showThemesBreakdown, setShowThemesBreakdown] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  // Initialize Mermaid on mount
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        useMaxWidth: false,
        padding: 20,
      },
      themeVariables: {
        darkMode: true,
        background: '#090d16',
        primaryColor: '#4338ca',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#6366f1',
        lineColor: '#818cf8',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#0f172a',
        textColor: '#e2e8f0',
        nodeBorder: '#6366f1',
        clusterBkg: '#0f172a',
        clusterBorder: '#334155',
        titleColor: '#f8fafc',
      },
    });
  }, []);

  // Update customSyntax when mindMap changes
  useEffect(() => {
    if (mindMap?.mermaidSyntax) {
      setCustomSyntax(mindMap.mermaidSyntax);
    }
  }, [mindMap?.mermaidSyntax]);

  // Handle generation steps ticker
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setGenerationStep((prev) => (prev + 1) % 4);
      }, 2200);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Render Mermaid SVG
  const renderDiagram = useCallback(async (codeToRender: string) => {
    if (!codeToRender) return;
    setRenderError(null);

    const cleanCode = codeToRender.trim();
    const uniqueId = `mermaid_diag_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    try {
      // Test syntax validity
      const isValid = await mermaid.parse(cleanCode).catch((err) => {
        console.warn('Mermaid parse warning:', err);
        return false;
      });

      let finalSyntax = cleanCode;
      if (isValid === false) {
        // Attempt clean-up or fallback
        if (mindMap?.keyThemes && mindMap.keyThemes.length > 0) {
          finalSyntax = buildFallbackMermaid(studySet.title, mindMap.keyThemes);
        } else {
          finalSyntax = `flowchart TD\n  root["🚀 ${studySet.title.replace(/"/g, "'")}"]\n  root --> sub1["Core Overview"]\n  root --> sub2["Key Concepts"]`;
        }
      }

      const { svg } = await mermaid.render(uniqueId, finalSyntax);
      setSvgContent(svg);
      setRenderError(null);
    } catch (err: any) {
      console.error('Failed to render Mermaid diagram:', err);
      setRenderError('Could not parse diagram syntax. You can edit the Mermaid code below or click Regenerate.');
      
      // Fallback render
      try {
        const fallback = buildFallbackMermaid(
          studySet.title,
          mindMap?.keyThemes || [
            { theme: 'Overview', description: 'Core principles' },
            { theme: 'Key Concepts', description: 'Foundational ideas' },
          ]
        );
        const { svg } = await mermaid.render(uniqueId + '_fb', fallback);
        setSvgContent(svg);
      } catch (fallbackErr) {
        console.error('Fallback diagram failed:', fallbackErr);
      }
    }
  }, [mindMap?.keyThemes, studySet.title]);

  // Trigger diagram render when mindMap or customSyntax changes
  useEffect(() => {
    const syntax = customSyntax || mindMap?.mermaidSyntax;
    if (syntax) {
      renderDiagram(syntax);
    }
  }, [mindMap?.mermaidSyntax, customSyntax, renderDiagram]);

  // Center / Fit diagram in viewport
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.3));
  };

  // Drag & Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left click
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.0012;
    setZoom((prev) => {
      const next = prev + zoomFactor;
      return Math.min(Math.max(next, 0.3), 3.5);
    });
  };

  // API Call to Generate Mind Map
  const handleGenerateMindMap = async (layout: 'flowchart-td' | 'flowchart-lr' = selectedLayout) => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep(0);

    try {
      const response = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyContext: {
            title: studySet.title,
            summary: studySet.summary,
            rawTextSnippet: studySet.rawTextSnippet,
          },
          layoutStyle: layout,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${response.status}`);
      }

      const result = await response.json();
      if (!result.mindMap) {
        throw new Error('No mind map diagram generated. Please try again.');
      }

      const updatedSet: StudySet = {
        ...studySet,
        mindMap: result.mindMap,
      };

      onUpdateStudySet(updatedSet);
      setCustomSyntax(result.mindMap.mermaidSyntax);
      handleResetView();
    } catch (err: any) {
      console.error('Generate mind map error:', err);
      setGenerationError(err.message || 'Failed to generate mind map. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply custom edited syntax
  const handleApplyCustomSyntax = () => {
    if (!mindMap) return;
    const updatedSet: StudySet = {
      ...studySet,
      mindMap: {
        ...mindMap,
        mermaidSyntax: customSyntax,
      },
    };
    onUpdateStudySet(updatedSet);
    renderDiagram(customSyntax);
    setShowCodeEditor(false);
  };

  // Copy Mermaid Code
  const handleCopyCode = () => {
    const code = customSyntax || mindMap?.mermaidSyntax || '';
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Download SVG
  const handleDownloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${studySet.title.replace(/\s+/g, '_')}_MindMap.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedNotification('Downloaded SVG diagram!');
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // Download PNG by rendering SVG to Canvas
  const handleDownloadPNG = () => {
    if (!svgContent) return;

    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // Hi-DPI resolution
      const bbox = svgElement.getBoundingClientRect();
      canvas.width = (bbox.width || 1200) * scale;
      canvas.height = (bbox.height || 800) * scale;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pngURL = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${studySet.title.replace(/\s+/g, '_')}_MindMap.png`;
        downloadLink.href = pngURL;
        downloadLink.click();
        setCopiedNotification('Downloaded PNG image!');
        setTimeout(() => setCopiedNotification(null), 2500);
      }
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  const steps = [
    'Extracting foundational concepts and core hierarchies...',
    'Architecting thematic clusters and directed relationships...',
    'Synthesizing strict Mermaid.js flowchart code...',
    'Styling high-contrast visual node aesthetics...',
  ];

  // 1. Initial State: No Mind Map generated yet
  if (!mindMap) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-indigo-700 shadow-xl shadow-indigo-600/30 text-white mx-auto">
            <Network className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Visual Knowledge Architect</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Generate Interactive Concept Diagram
            </h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Transform your notes into an interactive hierarchical flowchart rendered in Mermaid.js. Explore connected concepts, core themes, and multi-tier relationships with full pan and zoom controls.
            </p>
          </div>

          {/* Layout Choice */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 text-left space-y-3">
            <label className="text-xs font-bold text-indigo-300 block">
              Choose Diagram Orientation:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedLayout('flowchart-td')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  selectedLayout === 'flowchart-td'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <ArrowDownUp className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Top-Down Hierarchy (TD)</div>
                  <div className="text-[11px] text-slate-400">Pillar branches descending downward</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLayout('flowchart-lr')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  selectedLayout === 'flowchart-lr'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <ArrowLeftRight className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Left-to-Right Flow (LR)</div>
                  <div className="text-[11px] text-slate-400">Horizontal process & concept sequence</div>
                </div>
              </button>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                <Layers className="w-4 h-4" />
                <span>Multi-Tier Structure</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Major themes down to granular definitions & mechanisms.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                <Move className="w-4 h-4" />
                <span>Pan & Smooth Zoom</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Drag to explore, mouse wheel zoom, reset & fit-to-screen.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Download className="w-4 h-4" />
                <span>Export SVG & PNG</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Export vector graphics or copy Mermaid code to Obsidian.
              </p>
            </div>
          </div>

          {generationError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
              <strong>Generation Notice:</strong> {generationError}
            </div>
          )}

          {/* Primary CTA Button */}
          <div className="pt-2">
            <button
              onClick={() => handleGenerateMindMap(selectedLayout)}
              disabled={isGenerating}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-indigo-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-3 mx-auto"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Synthesizing Concept Mind Map...</span>
                </>
              ) : (
                <>
                  <Network className="w-5 h-5" />
                  <span>Generate Visual Mind Map</span>
                </>
              )}
            </button>
          </div>

          {isGenerating && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-cyan-300">
                <span className="font-semibold">{steps[generationStep]}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Step {generationStep + 1} of 4
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${((generationStep + 1) / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Active Mind Map View
  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                <span>Concept Diagram</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                <Layout className="w-3 h-3 text-indigo-400" />
                <span>{mindMap.layoutStyle === 'flowchart-lr' ? 'Left-to-Right Flow' : 'Top-Down Flowchart'}</span>
              </span>

              {mindMap.keyThemes && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
                  <Layers className="w-3 h-3" />
                  <span>{mindMap.keyThemes.length} Key Themes</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
              {mindMap.title}
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              {mindMap.overview}
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Layout switch button */}
            <button
              onClick={() => {
                const nextLayout = mindMap.layoutStyle === 'flowchart-lr' ? 'flowchart-td' : 'flowchart-lr';
                setSelectedLayout(nextLayout);
                handleGenerateMindMap(nextLayout);
              }}
              disabled={isGenerating}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title={`Switch orientation to ${mindMap.layoutStyle === 'flowchart-lr' ? 'Top-Down' : 'Left-to-Right'}`}
            >
              {mindMap.layoutStyle === 'flowchart-lr' ? (
                <>
                  <ArrowDownUp className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Top-Down</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Left-Right</span>
                </>
              )}
            </button>

            {/* Download SVG */}
            <button
              onClick={handleDownloadSVG}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Download as SVG Vector Graphic"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">SVG</span>
            </button>

            {/* Regenerate Button */}
            <button
              onClick={() => handleGenerateMindMap(selectedLayout)}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
              title="Regenerate Concept Diagram with Gemini"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Regenerating...' : 'Regenerate'}</span>
            </button>
          </div>
        </div>

        {copiedNotification && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{copiedNotification}</span>
          </div>
        )}
      </div>

      {/* Code Editor Drawer */}
      {showCodeEditor && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>Mermaid.js Diagram Syntax Editor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                Live Renderer
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
              <button
                onClick={() => setShowCodeEditor(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>

          <textarea
            value={customSyntax}
            onChange={(e) => setCustomSyntax(e.target.value)}
            rows={8}
            className="w-full p-3 font-mono text-xs text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Enter valid Mermaid.js diagram code..."
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-slate-400">
              Tip: You can modify node labels, relations (e.g. <code>{'A --> B'}</code>), or paste into Markdown &amp; Obsidian.
            </p>
            <button
              onClick={handleApplyCustomSyntax}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Apply & Re-Render
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Diagram Canvas Area */}
      <div
        className={`relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
            : 'h-[620px] w-full'
        }`}
      >
        {/* Floating Pan & Zoom Controls Toolbar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-xl">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomOut}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={handleResetView}
            className="px-2.5 py-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs font-mono font-bold"
            title="Reset View / Fit to Center"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={handleResetView}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Center Diagram"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Pan Hint Overlay in bottom corner */}
        <div className="absolute bottom-4 right-4 z-20 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 pointer-events-none flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click & Drag to Pan • Mouse Wheel to Zoom</span>
        </div>

        {/* Render Error Alert */}
        {renderError && (
          <div className="absolute top-4 right-4 z-20 max-w-md bg-rose-950/90 border border-rose-500/50 p-3 rounded-xl text-xs text-rose-200 shadow-xl">
            <div className="font-bold flex items-center gap-1.5 text-rose-300">
              <Info className="w-4 h-4" />
              <span>Diagram Rendering Notice</span>
            </div>
            <p className="mt-1 text-[11px] text-rose-200">{renderError}</p>
          </div>
        )}

        {/* Interactive Canvas Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        >
          <div
            ref={diagramRef}
            className="transition-transform duration-75 ease-out origin-center inline-block p-10"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </div>

      {/* Extracted Key Themes Breakdown Accordion */}
      {mindMap.keyThemes && mindMap.keyThemes.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div
            onClick={() => setShowThemesBreakdown(!showThemesBreakdown)}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-extrabold text-slate-100">
                Key Themes & Conceptual Pillars ({mindMap.keyThemes.length})
              </h3>
              <span className="text-xs text-slate-400 font-normal">
                (Extracted from upload)
              </span>
            </div>

            <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 text-slate-400 group-hover:text-slate-200 transition">
              {showThemesBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {showThemesBreakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1 animate-in fade-in">
              {mindMap.keyThemes.map((themeObj, idx) => (
                <div
                  key={`theme_${idx}`}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 hover:border-indigo-500/40 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-100">
                      {themeObj.theme}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {themeObj.description}
                  </p>

                  {themeObj.subtopics && themeObj.subtopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {themeObj.subtopics.map((sub, sIdx) => (
                        <span
                          key={`sub_${idx}_${sIdx}`}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
