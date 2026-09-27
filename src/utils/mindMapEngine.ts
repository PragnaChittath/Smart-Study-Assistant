import { useReducer, useCallback } from 'react';
import mermaid from 'mermaid';
import { StudySet, MindMapData } from '../types';

export interface MindMapCanvasState {
  zoomScale: number;
  panOffset: { x: number; y: number };
  draggingActive: boolean;
  dragReference: { x: number; y: number };
  fullscreenEnabled: boolean;
  codeEditorOpen: boolean;
  customMermaidScript: string;
  themesBreakdownOpen: boolean;
  codeCopiedAlert: boolean;
  statusNotification: string | null;
  selectedLayoutDirective: 'flowchart-td' | 'flowchart-lr';
  renderFault: string | null;
  svgPayload: string;
  isSynthesizing: boolean;
  synthesisPhase: number;
  synthesisError: string | null;
}

export type MindMapCanvasAction =
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'ADJUST_ZOOM'; payload: number }
  | { type: 'RESET_VIEW' }
  | { type: 'START_DRAGGING'; payload: { x: number; y: number } }
  | { type: 'UPDATE_PAN'; payload: { x: number; y: number } }
  | { type: 'STOP_DRAGGING' }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'TOGGLE_CODE_EDITOR' }
  | { type: 'SET_CUSTOM_SCRIPT'; payload: string }
  | { type: 'TOGGLE_THEMES_BREAKDOWN' }
  | { type: 'SET_CODE_COPIED'; payload: boolean }
  | { type: 'SET_STATUS_NOTIFICATION'; payload: string | null }
  | { type: 'SET_LAYOUT_DIRECTIVE'; payload: 'flowchart-td' | 'flowchart-lr' }
  | { type: 'SET_SVG_PAYLOAD'; payload: string }
  | { type: 'SET_RENDER_FAULT'; payload: string | null }
  | { type: 'START_SYNTHESIS' }
  | { type: 'TICK_SYNTHESIS_PHASE' }
  | { type: 'SYNTHESIS_SUCCESS'; payload: string }
  | { type: 'SYNTHESIS_FAILURE'; payload: string };

export function mindMapCanvasReducer(
  state: MindMapCanvasState,
  action: MindMapCanvasAction
): MindMapCanvasState {
  switch (action.type) {
    case 'SET_ZOOM':
      return { ...state, zoomScale: Math.min(Math.max(action.payload, 0.3), 3.5) };
    case 'ADJUST_ZOOM':
      return { ...state, zoomScale: Math.min(Math.max(state.zoomScale + action.payload, 0.3), 3.5) };
    case 'RESET_VIEW':
      return { ...state, zoomScale: 1, panOffset: { x: 0, y: 0 } };
    case 'START_DRAGGING':
      return {
        ...state,
        draggingActive: true,
        dragReference: {
          x: action.payload.x - state.panOffset.x,
          y: action.payload.y - state.panOffset.y,
        },
      };
    case 'UPDATE_PAN':
      if (!state.draggingActive) return state;
      return {
        ...state,
        panOffset: {
          x: action.payload.x - state.dragReference.x,
          y: action.payload.y - state.dragReference.y,
        },
      };
    case 'STOP_DRAGGING':
      return { ...state, draggingActive: false };
    case 'TOGGLE_FULLSCREEN':
      return { ...state, fullscreenEnabled: !state.fullscreenEnabled };
    case 'TOGGLE_CODE_EDITOR':
      return { ...state, codeEditorOpen: !state.codeEditorOpen };
    case 'SET_CUSTOM_SCRIPT':
      return { ...state, customMermaidScript: action.payload };
    case 'TOGGLE_THEMES_BREAKDOWN':
      return { ...state, themesBreakdownOpen: !state.themesBreakdownOpen };
    case 'SET_CODE_COPIED':
      return { ...state, codeCopiedAlert: action.payload };
    case 'SET_STATUS_NOTIFICATION':
      return { ...state, statusNotification: action.payload };
    case 'SET_LAYOUT_DIRECTIVE':
      return { ...state, selectedLayoutDirective: action.payload };
    case 'SET_SVG_PAYLOAD':
      return { ...state, svgPayload: action.payload, renderFault: null };
    case 'SET_RENDER_FAULT':
      return { ...state, renderFault: action.payload };
    case 'START_SYNTHESIS':
      return { ...state, isSynthesizing: true, synthesisPhase: 0, synthesisError: null };
    case 'TICK_SYNTHESIS_PHASE':
      return { ...state, synthesisPhase: (state.synthesisPhase + 1) % 4 };
    case 'SYNTHESIS_SUCCESS':
      return {
        ...state,
        isSynthesizing: false,
        customMermaidScript: action.payload,
        zoomScale: 1,
        panOffset: { x: 0, y: 0 },
        synthesisError: null,
      };
    case 'SYNTHESIS_FAILURE':
      return { ...state, isSynthesizing: false, synthesisError: action.payload };
    default:
      return state;
  }
}

export function constructFallbackMermaidDiagram(
  title: string,
  themes: Array<{ theme: string; description: string; subtopics?: string[] }>
): string {
  const lines: string[] = ['flowchart TD'];
  const sanitizedTitle = title.replace(/["\n\r]/g, "'");
  lines.push(`  root["🚀 ${sanitizedTitle}"]`);

  const topThemes = themes.slice(0, 5);
  for (let i = 0; i < topThemes.length; i++) {
    const t = topThemes[i];
    const themeNodeId = `theme${i + 1}`;
    const sanitizedTheme = t.theme.replace(/["\n\r]/g, "'");
    lines.push(`  root --> ${themeNodeId}["📌 ${sanitizedTheme}"]`);

    if (t.subtopics && t.subtopics.length > 0) {
      const topSubs = t.subtopics.slice(0, 3);
      for (let j = 0; j < topSubs.length; j++) {
        const subId = `sub_${i + 1}_${j + 1}`;
        const sanitizedSub = topSubs[j].replace(/["\n\r]/g, "'");
        lines.push(`  ${themeNodeId} --> ${subId}["🔹 ${sanitizedSub}"]`);
      }
    }
  }

  lines.push('  classDef rootStyle fill:#4338ca,stroke:#818cf8,stroke-width:3px,color:#ffffff,font-weight:bold;');
  lines.push('  classDef themeStyle fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff,font-weight:bold;');
  lines.push('  classDef subStyle fill:#0f172a,stroke:#38bdf8,stroke-width:1px,color:#f8fafc;');
  lines.push('  class root rootStyle;');
  lines.push('  class theme1,theme2,theme3,theme4,theme5 themeStyle;');

  return lines.join('\n');
}

export function downloadSvgArtifact(svgData: string, filenamePrefix: string): void {
  if (!svgData) return;
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${filenamePrefix.replace(/\s+/g, '_')}_MindMap.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
