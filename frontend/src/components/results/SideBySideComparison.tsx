import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, SplitSquareVertical, Rows, Maximize2, Minimize2, AlertCircle, FileCode } from 'lucide-react';

interface SideBySideComparisonProps {
  originalCode: string;
  proposedCode: string | null;
  language?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const SideBySideComparison: React.FC<SideBySideComparisonProps> = ({
  originalCode,
  proposedCode,
  language = 'python',
  isExpanded = false,
  onToggleExpand,
}) => {
  // Layout mode: 'columns' (side-by-side) or 'stacked' (full-width rows)
  const [layoutMode, setLayoutMode] = useState<'columns' | 'stacked'>('columns');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const hasProposedCode = Boolean(proposedCode && proposedCode.trim().length > 0);
  const rawProposedCode = proposedCode || '';
  const originalLines = originalCode ? originalCode.split('\n') : [''];
  const proposedLines = hasProposedCode ? rawProposedCode.split('\n') : [''];

  /**
   * Copies ONLY raw proposed source code to clipboard with zero line numbers or UI chrome.
   */
  const handleCopyCorrectedCode = async () => {
    if (!hasProposedCode) {
      setErrorMessage('No corrected code available to copy.');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(rawProposedCode);
      } else {
        // Safe fallback for non-HTTPS or headless/unsupported clipboard environments
        const textArea = document.createElement('textarea');
        textArea.value = rawProposedCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) {
          throw new Error('Fallback clipboard command failed');
        }
      }

      setCopyStatus('success');
      setErrorMessage(null);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopyStatus('idle');
      }, 2200);
    } catch {
      setCopyStatus('error');
      setErrorMessage('Clipboard copy failed. Please select and copy code manually.');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopyStatus('idle');
        setErrorMessage(null);
      }, 4000);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3.5 min-w-0" data-testid="side-by-side-comparison">
      {/* Screen reader live announcement */}
      <div className="sr-only" aria-live="polite">
        {copyStatus === 'success' ? 'Corrected code copied to clipboard.' : ''}
        {copyStatus === 'error' ? (errorMessage || 'Failed to copy corrected code.') : ''}
      </div>

      {/* Comparison Top Header Toolbar */}
      <div className="border-b-2 border-[#28251F] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-bold text-sm uppercase text-[#28251F] tracking-wide">
              ORIGINAL VS. PROPOSED FIX
            </h3>
            <span className="brutal-badge bg-[#F1E8D6] text-[#28251F] text-[10px]">
              DIFF INSPECTION
            </span>
            <span className="brutal-badge bg-[#FFFCF4] text-[#71695D] text-[10px] hidden sm:inline-flex">
              <FileCode className="h-3 w-3 mr-1 text-[#71695D]" />
              LANG: {language.toUpperCase()}
            </span>
          </div>
          <p className="font-mono text-xs text-[#71695D] mt-0.5">
            Compare submitted input against Senior_Debugger synthesized fix.
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Primary Action: Copy Corrected Code Button */}
          <button
            type="button"
            onClick={handleCopyCorrectedCode}
            disabled={!hasProposedCode}
            aria-label="Copy corrected code"
            className={`brutal-btn px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
              !hasProposedCode
                ? 'opacity-50 cursor-not-allowed bg-[#EADEC6] text-[#71695D]'
                : copyStatus === 'success'
                ? 'bg-[#83B8AD] text-[#28251F]'
                : copyStatus === 'error'
                ? 'bg-[#E65B45] text-white'
                : 'bg-[#D7F36A] text-[#28251F] hover:bg-[#c8e858]'
            }`}
          >
            {copyStatus === 'success' ? (
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                Copied!
              </span>
            ) : copyStatus === 'error' ? (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Copy failed
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                Copy corrected code
              </span>
            )}
          </button>

          {/* Layout Mode Selector (Columns vs Stacked) */}
          <div className="flex items-center border-2 border-[#28251F] bg-[#FFFCF4] shadow-[1.5px_1.5px_0px_#28251F] p-0.5">
            <button
              type="button"
              onClick={() => setLayoutMode('columns')}
              className={`p-1 text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                layoutMode === 'columns'
                  ? 'bg-[#28251F] text-[#FFFCF4]'
                  : 'text-[#71695D] hover:text-[#28251F]'
              }`}
              title="Side-by-side columns view"
              aria-label="Side-by-side columns view"
            >
              <SplitSquareVertical className="h-3.5 w-3.5" />
              <span className="hidden xl:inline text-[10px]">SPLIT</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('stacked')}
              className={`p-1 text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                layoutMode === 'stacked'
                  ? 'bg-[#28251F] text-[#FFFCF4]'
                  : 'text-[#71695D] hover:text-[#28251F]'
              }`}
              title="Stacked rows view"
              aria-label="Stacked rows view"
            >
              <Rows className="h-3.5 w-3.5" />
              <span className="hidden xl:inline text-[10px]">STACKED</span>
            </button>
          </div>

          {/* Wide / Expand View Toggle (if callback provided) */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="brutal-btn brutal-btn-secondary p-1.5 text-xs bg-[#FFFCF4]"
              title={isExpanded ? 'Collapse to split workbench' : 'Expand comparison to full width'}
              aria-label={isExpanded ? 'Collapse comparison view' : 'Expand comparison to full width'}
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5 text-[#28251F]" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 text-[#28251F]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Failure banner if copy error occurs */}
      {errorMessage && (
        <div className="p-2.5 bg-[#FFFCF4] border-2 border-[#E65B45] text-[#E65B45] font-mono text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Comparison Grid / Stack Layout Container */}
      <div
        className={`w-full min-w-0 gap-4 ${
          layoutMode === 'columns'
            ? 'grid grid-cols-1 md:grid-cols-2'
            : 'flex flex-col space-y-4'
        }`}
      >
        {/* PANEL 1: ORIGINAL CODE */}
        <div className="border-2 border-[#28251F] bg-[#FFFCF4] shadow-[3px_3px_0px_#28251F] flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="border-b-2 border-[#28251F] bg-[#F1E8D6] px-3.5 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="brutal-badge bg-[#FFFCF4] border-[#E65B45] text-[#E65B45] font-bold text-[11px]">
                [-] ORIGINAL CODE
              </span>
              <span className="font-mono text-[10px] text-[#71695D]">
                SUBMITTED INPUT
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#71695D]">
              {originalLines.length} lines • {originalCode.length} chars
            </div>
          </div>

          {/* Synchronized Scroll Code View with Sticky Gutter */}
          <div className="relative flex-1 min-h-[240px] max-h-[480px] overflow-auto bg-[#FFFCF4]">
            <div className="flex min-w-full w-max">
              {/* Sticky Line Numbers Gutter */}
              <div
                aria-hidden="true"
                className="sticky left-0 select-none bg-[#F8F4E8] border-r border-[#28251F] py-2.5 px-2 text-right font-mono text-xs text-[#71695D] shrink-0 z-10 w-11"
              >
                {originalLines.map((_, i) => (
                  <div key={i} className="leading-[1.6]">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code Pre Area */}
              <div className="py-2.5 px-3 min-w-0">
                <pre className="font-mono text-xs leading-[1.6] text-[#28251F] whitespace-pre selection:bg-[#E65B45] selection:text-white">
                  {originalCode}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: PROPOSED FIX */}
        <div className="border-2 border-[#28251F] bg-[#FFFCF4] shadow-[3px_3px_0px_#28251F] flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="border-b-2 border-[#28251F] bg-[#F1E8D6] px-3.5 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="brutal-badge bg-[#D7F36A] border-[#28251F] text-[#28251F] font-bold text-[11px]">
                [+] PROPOSED FIX
              </span>
              <span className="font-mono text-[10px] text-[#71695D]">
                SENIOR_DEBUGGER
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[#71695D]">
                {proposedLines.length} lines • {rawProposedCode.length} chars
              </span>

              {/* Secondary Icon-Only Copy Button inside Panel Header */}
              {hasProposedCode && (
                <button
                  type="button"
                  onClick={handleCopyCorrectedCode}
                  className="brutal-btn brutal-btn-secondary p-1 text-[11px] bg-[#FFFCF4]"
                  title="Copy corrected code"
                  aria-label="Copy corrected code"
                >
                  {copyStatus === 'success' ? (
                    <Check className="h-3 w-3 text-[#28251F]" />
                  ) : (
                    <Copy className="h-3 w-3 text-[#28251F]" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Synchronized Scroll Code View with Sticky Gutter */}
          <div className="relative flex-1 min-h-[240px] max-h-[480px] overflow-auto bg-[#F1E8D6]">
            {hasProposedCode ? (
              <div className="flex min-w-full w-max">
                {/* Sticky Line Numbers Gutter */}
                <div
                  aria-hidden="true"
                  className="sticky left-0 select-none bg-[#EADEC6] border-r border-[#28251F] py-2.5 px-2 text-right font-mono text-xs text-[#71695D] shrink-0 z-10 w-11"
                >
                  {proposedLines.map((_, i) => (
                    <div key={i} className="leading-[1.6]">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Code Pre Area */}
                <div className="py-2.5 px-3 min-w-0">
                  <pre className="font-mono text-xs leading-[1.6] text-[#28251F] whitespace-pre selection:bg-[#D7F36A] selection:text-[#28251F]">
                    {rawProposedCode}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-8 font-mono text-xs text-[#71695D] text-center italic">
                No proposed fix was generated by the debugging agent.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
