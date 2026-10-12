import React from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

interface AlertBannerProps {
  type: 'warning' | 'error';
  title: string;
  message: string;
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  onDismiss,
}) => {
  const isWarning = type === 'warning';

  return (
    <div
      className={`brutal-card p-4 flex items-start space-x-3 mb-6 border-2 border-[#28251F] ${
        isWarning
          ? 'bg-[#FFFCF4] shadow-[3px_3px_0px_#28251F]'
          : 'bg-[#FFFCF4] border-[#E65B45] shadow-[3px_3px_0px_#E65B45]'
      }`}
    >
      <div
        className={`p-1.5 border border-[#28251F] shrink-0 ${
          isWarning ? 'bg-[#D7F36A] text-[#28251F]' : 'bg-[#E65B45] text-white'
        }`}
      >
        {isWarning ? (
          <AlertTriangle className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5" />
        )}
      </div>

      <div className="flex-1 font-mono text-xs">
        <h4 className="font-heading font-bold text-sm mb-0.5 text-[#28251F] uppercase flex items-center gap-2">
          {title}
        </h4>
        <p className="leading-relaxed text-[#28251F]">{message}</p>
        {isWarning && (
          <div className="mt-2 text-[11px] text-[#71695D] font-mono">
            <span>CONFIGURE: Add <code className="bg-[#F1E8D6] px-1 py-0.5 border border-[#28251F] font-bold">GROQ_API_KEY=gsk_...</code> to <code className="bg-[#F1E8D6] px-1 py-0.5 border border-[#28251F] font-bold">backend/.env</code></span>
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="brutal-btn brutal-btn-secondary p-1 text-[#28251F] bg-[#FFFCF4]"
          title="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
