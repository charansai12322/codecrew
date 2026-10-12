import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, CheckCircle2, AlertTriangle, Clock, Layers, ShieldCheck, Search, Wrench, SplitSquareVertical } from 'lucide-react';
import type { ReviewResponse } from '../../types';
import { SideBySideComparison } from './SideBySideComparison';

interface ResultsViewProps {
  result: ReviewResponse | null;
  isLoading: boolean;
  originalCode: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  isLoading,
  originalCode,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [activeTab, setActiveTab] = useState<'fix' | 'analysis' | 'verification' | 'diff'>('fix');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = (text: string, type: 'code' | 'analysis') => {
    try {
      navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedAnalysis(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedAnalysis(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  // 1. Loading State: Archival Editorial Inspection Scanner
  if (isLoading) {
    return (
      <div className="brutal-card flex flex-col justify-between h-full min-h-[460px] bg-[#FFFCF4] p-6 text-center border-2 border-[#28251F]">
        {/* Top Header Rail */}
        <div className="flex items-center justify-between border-b-2 border-[#28251F] pb-3">
          <span className="font-mono text-xs font-bold uppercase text-[#71695D]">
            // DISSECTION ENGINE ENGAGED
          </span>
          <span className="brutal-badge bg-[#D7F36A] text-[#28251F] animate-pulse">
            LIVE INFERENCE
          </span>
        </div>

        {/* Center Scanner Graphic */}
        <div className="py-12 flex flex-col items-center">
          <div className="relative w-48 h-20 border-2 border-[#28251F] bg-[#F1E8D6] shadow-[3px_3px_0px_#28251F] flex items-center justify-center overflow-hidden mb-5">
            {/* Animated scanning bar */}
            <div className="absolute inset-y-0 w-8 bg-[#D7F36A] border-x-2 border-[#28251F] opacity-75 animate-editorial-scan" />
            <div className="relative font-mono text-xs font-bold uppercase text-[#28251F] z-10">
              ⟦ SCANNING CODE ⟧
            </div>
          </div>

          <h3 className="font-heading text-lg font-bold text-[#28251F] uppercase mb-1">
            Multi-Agent Sequential Review in Progress
          </h3>
          <p className="text-xs font-mono text-[#71695D] max-w-md mx-auto mb-4">
            Pipeline: Code_Analyzer (Defects) ➔ Senior_Debugger (Repair) ➔ code_reviewer (Verification)
          </p>

          <div className="font-mono text-[11px] text-[#28251F] bg-[#FFFCF4] border border-[#28251F] px-3 py-1 shadow-[2px_2px_0px_#28251F]">
            PROVIDER: GROQCLOUD // MODEL: OPENAI/GPT-OSS-120B
          </div>
        </div>

        {/* Bottom Rail Note */}
        <div className="border-t-2 border-[#28251F] pt-3 text-[11px] font-mono text-[#71695D]">
          Estimated execution: ~5.9s (Sub-second per model inference)
        </div>
      </div>
    );
  }

  // 2. Empty State: Archival Technical Blueprint
  if (!result) {
    return (
      <div className="brutal-card flex flex-col justify-between h-full min-h-[460px] bg-[#FFFCF4] p-6 text-center border-2 border-[#28251F]">
        <div className="flex items-center justify-between border-b-2 border-[#28251F] pb-3">
          <span className="font-mono text-xs font-bold uppercase text-[#71695D]">
            PANEL B: DISSECTION RESULTS
          </span>
          <span className="brutal-badge bg-[#F1E8D6] text-[#71695D]">
            AWAITING RUN
          </span>
        </div>

        <div className="py-12 flex flex-col items-center max-w-sm mx-auto">
          <div className="w-16 h-16 border-2 border-[#28251F] bg-[#F1E8D6] shadow-[3px_3px_0px_#28251F] flex items-center justify-center text-[#28251F] mb-4">
            <Layers className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="font-heading text-base font-bold uppercase text-[#28251F] mb-1.5">
            No Review Results Generated
          </h3>
          <p className="font-mono text-xs text-[#71695D] leading-relaxed mb-5">
            Submit code in the left panel or click <strong className="text-[#28251F]">Load Buggy Sample</strong> to trigger the automated 3-agent analysis and repair pipeline.
          </p>
          <div className="font-mono text-[11px] bg-[#F1E8D6] border border-[#28251F] px-3 py-1.5 text-[#28251F]">
            SHORTCUT: PRESS [Ctrl/⌘ + Enter]
          </div>
        </div>

        <div className="border-t-2 border-[#28251F] pt-3 text-[11px] font-mono text-[#71695D]">
          DISSECTION OUTPUT MANIFEST: CODE_ANALYZER // SENIOR_DEBUGGER // CODE_REVIEWER
        </div>
      </div>
    );
  }

  // 3. Populated Results Workspace
  const executionTime = result.execution_time_seconds ? `${result.execution_time_seconds}s` : 'N/A';
  const totalTokens = result.token_usage?.total_tokens ? result.token_usage.total_tokens.toLocaleString() : null;
  const isSyntaxValid = result.syntax_valid;

  return (
    <div className="brutal-card flex flex-col h-full bg-[#FFFCF4] overflow-hidden">
      {/* Results Header Metadata Bar */}
      <div className="border-b-2 border-[#28251F] bg-[#F1E8D6] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2">
          <span className="font-heading font-bold text-xs uppercase text-[#28251F]">
            PANEL B: RESULTS
          </span>

          {/* Syntax Status Badge */}
          {isSyntaxValid === true && (
            <span className="brutal-badge bg-[#83B8AD] text-[#28251F]" title="Python AST Syntax Validated">
              <CheckCircle2 className="h-3 w-3" /> AST VALID
            </span>
          )}
          {isSyntaxValid === false && (
            <span className="brutal-badge bg-[#E65B45] text-white" title="Syntax errors detected in fix">
              <AlertTriangle className="h-3 w-3" /> SYNTAX ISSUES
            </span>
          )}

          {/* Execution Time */}
          <span className="brutal-badge bg-[#FFFCF4] text-[#28251F]">
            <Clock className="h-3 w-3 text-[#71695D]" /> {executionTime}
          </span>

          {/* Tokens Metric */}
          {totalTokens && (
            <span className="brutal-badge bg-[#FFFCF4] text-[#28251F] hidden sm:inline-flex">
              TOKENS: {totalTokens}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#71695D]">
          <span>GROQ: {result.model}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b-2 border-[#28251F] bg-[#FFFCF4] px-4 pt-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('fix')}
          className={`brutal-btn text-xs py-1.5 px-3 rounded-none border-b-0 ${
            activeTab === 'fix'
              ? 'bg-[#D7F36A] text-[#28251F] shadow-[2px_-2px_0px_#28251F]'
              : 'bg-[#F1E8D6] text-[#71695D] shadow-none'
          }`}
        >
          <Wrench className="h-3.5 w-3.5 mr-1" />
          [01] PROPOSED FIX
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analysis')}
          className={`brutal-btn text-xs py-1.5 px-3 rounded-none border-b-0 ${
            activeTab === 'analysis'
              ? 'bg-[#B7A5E4] text-[#28251F] shadow-[2px_-2px_0px_#28251F]'
              : 'bg-[#F1E8D6] text-[#71695D] shadow-none'
          }`}
        >
          <Search className="h-3.5 w-3.5 mr-1" />
          [02] ANALYSIS REPORT
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('verification')}
          className={`brutal-btn text-xs py-1.5 px-3 rounded-none border-b-0 ${
            activeTab === 'verification'
              ? 'bg-[#83B8AD] text-[#28251F] shadow-[2px_-2px_0px_#28251F]'
              : 'bg-[#F1E8D6] text-[#71695D] shadow-none'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
          [03] VERIFICATION
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diff')}
          className={`brutal-btn text-xs py-1.5 px-3 rounded-none border-b-0 ${
            activeTab === 'diff'
              ? 'bg-[#FFFCF4] text-[#28251F] border-b-transparent shadow-[2px_-2px_0px_#28251F]'
              : 'bg-[#F1E8D6] text-[#71695D] shadow-none'
          }`}
        >
          <SplitSquareVertical className="h-3.5 w-3.5 mr-1" />
          [04] SIDE-BY-SIDE
        </button>
      </div>

      {/* Tab Content Display Area */}
      <div className="flex-1 p-4 overflow-auto bg-[#FFFCF4]">
        {/* TAB 1: PROPOSED FIX (Senior_Debugger) */}
        {activeTab === 'fix' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between border-b border-[#28251F] pb-2">
              <div>
                <span className="font-mono text-xs font-bold text-[#28251F] uppercase">
                  AGENT 2: SENIOR_DEBUGGER // REPAIRED CODE
                </span>
                <p className="text-[11px] font-mono text-[#71695D]">
                  Executable Python correction preserving program structure with # FIX: comments.
                </p>
              </div>

              {result.proposed_code && (
                <button
                  type="button"
                  onClick={() => handleCopy(result.proposed_code || '', 'code')}
                  className="brutal-btn brutal-btn-secondary text-xs py-1 px-3 bg-[#FFFCF4]"
                >
                  {copiedCode ? (
                    <span className="flex items-center gap-1 text-[#28251F] font-bold">
                      <Check className="h-3.5 w-3.5 text-[#83B8AD]" /> COPIED!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" /> COPY CODE
                    </span>
                  )}
                </button>
              )}
            </div>

            {result.proposed_code ? (
              <div className="border-2 border-[#28251F] bg-[#F1E8D6] shadow-[2px_2px_0px_#28251F] p-3 font-mono text-xs leading-[1.6] overflow-x-auto text-[#28251F]">
                <pre>{result.proposed_code}</pre>
              </div>
            ) : (
              <div className="p-4 border-2 border-dashed border-[#71695D] font-mono text-xs text-[#71695D] text-center">
                No code output was returned by the Senior_Debugger agent.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ANALYSIS REPORT (Code_Analyzer) */}
        {activeTab === 'analysis' && (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-[#28251F] pb-2">
              <div>
                <span className="font-mono text-xs font-bold text-[#28251F] uppercase">
                  AGENT 1: CODE_ANALYZER // ROOT CAUSE DIAGNOSIS
                </span>
                <p className="text-[11px] font-mono text-[#71695D]">
                  Architectural defect taxonomy, logical flaws, and edge-case risks.
                </p>
              </div>

              {result.analysis_report && (
                <button
                  type="button"
                  onClick={() => handleCopy(result.analysis_report || '', 'analysis')}
                  className="brutal-btn brutal-btn-secondary text-xs py-1 px-3 bg-[#FFFCF4]"
                >
                  {copiedAnalysis ? (
                    <span className="flex items-center gap-1 text-[#28251F] font-bold">
                      <Check className="h-3.5 w-3.5 text-[#83B8AD]" /> COPIED!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" /> COPY REPORT
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="border-2 border-[#28251F] bg-[#FFFCF4] shadow-[2px_2px_0px_#28251F] p-4 font-mono text-xs leading-[1.65] text-[#28251F] whitespace-pre-wrap overflow-x-auto">
              {result.analysis_report || 'No analysis report available.'}
            </div>
          </div>
        )}

        {/* TAB 3: VERIFICATION (code_reviewer) */}
        {activeTab === 'verification' && (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-[#28251F] pb-2">
              <div>
                <span className="font-mono text-xs font-bold text-[#28251F] uppercase">
                  AGENT 3: CODE_REVIEWER // TEST MATRIX & VERDICT
                </span>
                <p className="text-[11px] font-mono text-[#71695D]">
                  Verification across boundaries, negative numbers, empty structures, and types.
                </p>
              </div>

              <span className="brutal-badge bg-[#83B8AD] text-[#28251F]">
                VERIFIED STATUS
              </span>
            </div>

            <div className="border-2 border-[#28251F] bg-[#F1E8D6] shadow-[2px_2px_0px_#28251F] p-4 font-mono text-xs leading-[1.65] text-[#28251F] whitespace-pre-wrap overflow-x-auto">
              {result.review_findings || 'No verification findings available.'}
            </div>
          </div>
        )}

        {/* TAB 4: SIDE-BY-SIDE DIFF */}
        {activeTab === 'diff' && (
          <SideBySideComparison
            originalCode={originalCode}
            proposedCode={result.proposed_code}
            language={result.language}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        )}
      </div>

      {/* Footer Info Rail */}
      <div className="border-t-2 border-[#28251F] bg-[#F1E8D6] px-4 py-2 font-mono text-[11px] text-[#71695D] flex flex-wrap items-center justify-between gap-2">
        <span>REQUEST ID: {result.request_id || 'LOCAL-EVAL'}</span>
        <span className="uppercase">STATUS: {result.status}</span>
      </div>
    </div>
  );
};
