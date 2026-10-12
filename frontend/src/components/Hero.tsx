import React from 'react';

export const Hero: React.FC = () => {
  return (
    <section className="mb-6 pt-2">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b-2 border-[#28251F] pb-5">
        {/* Left Column: Bold Editorial Headline */}
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#71695D] bg-[#FFFCF4] px-2 py-0.5 border border-[#28251F]">
              // REF NO. 2026-CC // CREWAI ORCHESTRATION
            </span>
            <span className="font-mono text-xs text-[#71695D]">
              ⌖ PRECISION DISSECTION
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-[#28251F] tracking-tight leading-[1.05] uppercase">
            YOUR CODE.<br />
            <span className="text-[#28251F] bg-[#D7F36A] px-2 border-2 border-[#28251F] shadow-[3px_3px_0px_#28251F] inline-block mt-1">
              UNDER THE MICROSCOPE.
            </span>
          </h1>

          <p className="mt-3 text-base sm:text-lg font-heading font-medium text-[#71695D] max-w-2xl leading-snug">
            Three specialist agents. One rigorous review. Better code, with reasons.
          </p>
        </div>

        {/* Right Column: Restrained Technical Inspection Stamp & Pipeline Summary */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5">
          <div className="brutal-card-sm p-3 bg-[#FFFCF4] flex flex-col gap-1.5 max-w-xs text-left">
            <div className="flex items-center justify-between border-b border-[#28251F] pb-1">
              <span className="font-mono text-[10px] font-bold uppercase text-[#71695D]">
                INSPECTION MANIFEST
              </span>
              <span className="font-mono text-[10px] bg-[#B7A5E4] px-1 border border-[#28251F] font-bold">
                GROQ 120B
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#28251F] space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B7A5E4]" />
                <span className="font-bold">Code_Analyzer:</span> Diagnoses bugs & root causes
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D7F36A]" />
                <span className="font-bold">Senior_Debugger:</span> Produces executable repair
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#83B8AD]" />
                <span className="font-bold">code_reviewer:</span> Verifies fix with edge cases
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
