import React from 'react';
import { ExternalLink, Terminal, GitBranch } from 'lucide-react';
import { resolveApiUrl } from '../services/api';

export const Footer: React.FC = () => {
  const docsUrl = resolveApiUrl('/docs');
  const healthUrl = resolveApiUrl('/api/health');

  return (
    <footer className="border-t-[2.5px] border-[#28251F] bg-[#FFFCF4] mt-12 py-6 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-[#71695D]">
        <div className="flex items-center space-x-2">
          <span className="font-display text-base text-[#28251F]">CODECREW</span>
          <span>//</span>
          <span>SPEC.V1.0</span>
          <span>//</span>
          <span>ARCHIVAL BRUTALISM × DEVELOPER WORKBENCH</span>
        </div>

        <div className="flex items-center flex-wrap gap-4">
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#28251F] hover:underline"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>OPENAPI DOCS</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <a
            href={healthUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#28251F] hover:underline"
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>API STATUS</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <span className="brutal-badge bg-[#F1E8D6] text-[#28251F]">
            POWERED BY GROQCLOUD
          </span>
        </div>
      </div>
    </footer>
  );
};
