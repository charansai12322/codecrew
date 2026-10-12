import React from 'react';
import { Terminal, ShieldAlert, Cpu } from 'lucide-react';
import type { HealthStatus } from '../types';

interface HeaderProps {
  health: HealthStatus | null;
  healthLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ health, healthLoading }) => {
  return (
    <header className="border-b-[2.5px] border-[#28251F] bg-[#FFFCF4] px-4 sm:px-8 py-3.5 sticky top-0 z-50 shadow-[0_2px_0px_#28251F]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand Identity & Wordmark */}
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 border-2 border-[#28251F] bg-[#D7F36A] shadow-[2px_2px_0px_#28251F] flex items-center justify-center font-display text-lg text-[#28251F]">
            CC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl tracking-tight text-[#28251F] leading-none">
                CODECREW
              </span>
              <span className="brutal-badge bg-[#F1E8D6] text-[#28251F]">
                SPEC.V1
              </span>
              <span className="hidden md:inline-block font-mono text-[11px] text-[#71695D]">
                // ⌖ ARCHIVAL WORKBENCH
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#71695D] tracking-wide mt-0.5">
              AUTONOMOUS 3-AGENT CODE REPAIR & DISSECTION ENGINE
            </p>
          </div>
        </div>

        {/* Real Live Backend Health & Shortcuts */}
        <div className="flex items-center flex-wrap gap-2.5">
          {healthLoading ? (
            <div className="brutal-badge bg-[#F1E8D6] text-[#71695D]">
              <span className="h-2 w-2 rounded-full bg-[#E65B45] animate-ping" />
              <span>CONNECTING TO API...</span>
            </div>
          ) : health ? (
            <>
              <div className="brutal-badge bg-[#FFFCF4] text-[#28251F] hidden lg:inline-flex">
                <Terminal className="h-3 w-3 text-[#71695D]" />
                <span>MODEL: {health.model}</span>
              </div>

              {health.llm_configured ? (
                <div className="brutal-badge bg-[#83B8AD] text-[#28251F]">
                  <span className="h-2 w-2 rounded-full bg-[#28251F]" />
                  <span>GROQ CONNECTED</span>
                </div>
              ) : (
                <div className="brutal-badge bg-[#E65B45] text-white">
                  <ShieldAlert className="h-3 w-3" />
                  <span>KEY REQUIRED</span>
                </div>
              )}
            </>
          ) : (
            <div className="brutal-badge bg-[#E65B45] text-white">
              <ShieldAlert className="h-3 w-3" />
              <span>BACKEND OFFLINE</span>
            </div>
          )}

          <div className="hidden sm:flex brutal-badge bg-[#F1E8D6] text-[#71695D] font-mono">
            <Cpu className="h-3 w-3" />
            <span>[Ctrl/⌘ + ↵] SUBMIT</span>
          </div>
        </div>
      </div>
    </header>
  );
};
