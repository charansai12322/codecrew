import React from 'react';
import { Search, Wrench, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ReviewResponse } from '../../types';

interface PipelineStagesProps {
  isLoading: boolean;
  result: ReviewResponse | null;
  error: string | null;
}

export const PipelineStages: React.FC<PipelineStagesProps> = ({
  isLoading,
  result,
  error,
}) => {
  const isCompleted = !!result && result.status === 'completed';

  const agents = [
    {
      id: '01',
      name: 'Code_Analyzer',
      role: 'Software Architect & Defect Analyst',
      description: 'Dissects submitted code, detects logical errors, boundary bugs, and formats root-cause diagnosis.',
      color: '#B7A5E4', // Faded Iris
      icon: Search,
      hasOutput: !!result?.analysis_report,
    },
    {
      id: '02',
      name: 'Senior_Debugger',
      role: 'Senior Python Systems Engineer',
      description: 'Ingests diagnosis, preserves program architecture, and generates clean runnable fixes with # FIX comments.',
      color: '#D7F36A', // Acid Citron
      icon: Wrench,
      hasOutput: !!result?.proposed_code,
    },
    {
      id: '03',
      name: 'code_reviewer',
      role: 'Principal QA & Code Auditor',
      description: 'Executes independent verification matrix across edge cases and issues final VERIFIED review verdict.',
      color: '#83B8AD', // Dusty Teal
      icon: ShieldCheck,
      hasOutput: !!result?.review_findings,
    },
  ];

  return (
    <div className="brutal-card bg-[#FFFCF4] p-4 sm:p-5 border-2 border-[#28251F]">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#28251F] pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-sm uppercase text-[#28251F] tracking-wide">
              CREW PIPELINE TOPOLOGY
            </span>
            <span className="brutal-badge bg-[#F1E8D6] text-[#28251F] text-[10px]">
              CREWAI SEQUENTIAL PROCESS
            </span>
          </div>
          <p className="font-mono text-xs text-[#71695D] mt-0.5">
            Three specialized autonomous agents collaborating over context-passed task handoffs.
          </p>
        </div>

        {/* Global Pipeline State */}
        {isLoading && (
          <div className="brutal-badge bg-[#D7F36A] text-[#28251F] animate-pulse">
            <span className="h-2 w-2 rounded-full bg-[#28251F]" />
            <span>DISSECTION WORKFLOW ACTIVE</span>
          </div>
        )}
        {isCompleted && (
          <div className="brutal-badge bg-[#83B8AD] text-[#28251F]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>ALL 3 AGENTS VERIFIED ({result?.execution_time_seconds}s)</span>
          </div>
        )}
        {error && !isLoading && (
          <div className="brutal-badge bg-[#E65B45] text-white">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>PIPELINE HALTED</span>
          </div>
        )}
      </div>

      {/* 3 Agents Cards Sequence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div
              key={agent.id}
              className="border-2 border-[#28251F] bg-[#FFFCF4] p-3.5 shadow-[2px_2px_0px_#28251F] flex flex-col justify-between"
            >
              <div>
                {/* Agent Header Tag */}
                <div className="flex items-center justify-between border-b border-[#28251F] pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 border border-[#28251F] shadow-[1px_1px_0px_#28251F]"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span className="font-mono text-xs font-bold uppercase text-[#28251F]">
                      [{agent.id}] {agent.name}
                    </span>
                  </div>
                  <Icon className="h-4 w-4 text-[#28251F]" />
                </div>

                <div className="font-mono text-[11px] font-bold text-[#71695D] uppercase mb-1">
                  ROLE: {agent.role}
                </div>

                <p className="font-mono text-xs text-[#28251F] leading-snug">
                  {agent.description}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="mt-3 pt-2 border-t border-[#28251F] flex items-center justify-between font-mono text-[11px]">
                <span className="text-[#71695D]">STATE:</span>
                {agent.hasOutput ? (
                  <span className="font-bold text-[#28251F] bg-[#83B8AD] px-1.5 py-0.2 border border-[#28251F]">
                    OUTPUT PRODUCED
                  </span>
                ) : isLoading ? (
                  <span className="text-[#28251F] bg-[#D7F36A] px-1.5 py-0.2 border border-[#28251F] animate-pulse">
                    PROCESSING
                  </span>
                ) : (
                  <span className="text-[#71695D]">STANDBY</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
