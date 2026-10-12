import React, { useRef } from 'react';
import { Play, Clipboard, Trash2, Code2, Sparkles, AlertCircle } from 'lucide-react';
import type { ReviewFocus } from '../../types';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  focus: ReviewFocus;
  setFocus: (focus: ReviewFocus) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const COLAB_SAMPLE_CODE = `def calculate_average(numbers):
    total = 0
    for i in range(len(numbers)):
        total += numbers[i + 1]  # BUG: IndexError and offset
    avg = total / len(numbers)
    return avg

def find_max(numbers):
    max_val = 0  # BUG: Fails for all negative numbers
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val

def remove_duplicates(lst):
    for i in range(len(lst)):
        for j in range(i + 1, len(lst)):
            if lst[i] == lst[j]:
                lst.remove(lst[j])  # BUG: Mutation during iteration
    return lst

numbers = [3, 7, 2, 8, 2, 7, 4]
print("Average:", calculate_average(numbers))
print("Maximum:", find_max(numbers))
print("Without duplicates:", remove_duplicates(numbers))`;

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  setCode,
  language,
  setLanguage,
  focus,
  setFocus,
  onSubmit,
  isLoading,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = code ? code.split('\n') : [''];
  const lineCount = lines.length;
  const charCount = code.length;
  const isTooLong = charCount > 50000;
  const isEmpty = !code.trim();

  // Synchronize gutter scroll with textarea scroll
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleLoadSample = () => {
    setCode(COLAB_SAMPLE_CODE);
    setLanguage('python');
    setFocus('correctness');
  };

  const handleClear = () => {
    setCode('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCode(text);
      }
    } catch {
      // Clipboard access rejected or not available
    }
  };

  return (
    <div className="brutal-card flex flex-col h-full bg-[#FFFCF4] overflow-hidden">
      {/* Editorial Toolbar */}
      <div className="border-b-2 border-[#28251F] bg-[#F1E8D6] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <Code2 className="h-4 w-4 text-[#28251F]" />
            <span className="font-heading font-bold text-xs uppercase text-[#28251F] tracking-wider">
              PANEL A: CODE INPUT
            </span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1">
            <label htmlFor="language-select" className="font-mono text-[11px] text-[#71695D] font-bold uppercase">
              LANG:
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isLoading}
              className="brutal-select text-xs py-1 px-2 bg-[#FFFCF4]"
            >
              <option value="python">Python 3.12 (AST Verified)</option>
              <option value="javascript">JavaScript (ES2024)</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>

          {/* Focus Selector */}
          <div className="flex items-center gap-1">
            <label htmlFor="focus-select" className="font-mono text-[11px] text-[#71695D] font-bold uppercase">
              FOCUS:
            </label>
            <select
              id="focus-select"
              value={focus}
              onChange={(e) => setFocus(e.target.value as ReviewFocus)}
              disabled={isLoading}
              className="brutal-select text-xs py-1 px-2 bg-[#FFFCF4]"
            >
              <option value="correctness">Correctness & Bugs</option>
              <option value="security">Security & Risks</option>
              <option value="performance">Performance & Memory</option>
              <option value="general">Comprehensive General</option>
            </select>
          </div>
        </div>

        {/* Quick Utility Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isLoading}
            className="brutal-btn brutal-btn-secondary text-[11px] py-1 px-2.5 bg-[#FFFCF4]"
            title="Load canonical Colab test code containing 3 algorithmic defects"
          >
            <Sparkles className="h-3 w-3 mr-1 text-[#28251F]" />
            LOAD BUGGY SAMPLE
          </button>

          <button
            type="button"
            onClick={handlePaste}
            disabled={isLoading}
            className="brutal-btn brutal-btn-secondary text-[11px] py-1 px-2 bg-[#FFFCF4]"
            title="Paste from clipboard"
          >
            <Clipboard className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading || isEmpty}
            className="brutal-btn brutal-btn-secondary text-[11px] py-1 px-2 bg-[#FFFCF4]"
            title="Clear editor"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Editor Body with Gutter */}
      <div className="relative flex flex-1 min-h-[380px] lg:min-h-[460px] bg-[#FFFCF4]">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="w-12 py-3 pr-2 text-right font-mono text-xs select-none bg-[#F1E8D6] border-r-2 border-[#28251F] text-[#71695D] overflow-hidden"
        >
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i} className="leading-[1.6]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={handleScroll}
          disabled={isLoading}
          placeholder="// Paste or write source code here for multi-agent dissection...&#10;// Example:&#10;def add_numbers(a, b):&#10;    return a - b"
          spellCheck={false}
          className="code-editor-textarea flex-1 p-3 leading-[1.6] text-xs sm:text-sm font-mono overflow-auto focus:bg-white transition-colors"
        />
      </div>

      {/* Footer Info & Submission Rail */}
      <div className="border-t-2 border-[#28251F] bg-[#F1E8D6] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Character & Line Counters */}
        <div className="flex items-center gap-3 font-mono text-xs text-[#71695D]">
          <span>LINES: <strong className="text-[#28251F]">{lineCount}</strong></span>
          <span>•</span>
          <span className={isTooLong ? 'text-[#E65B45] font-bold' : ''}>
            CHARS: <strong className="text-[#28251F]">{charCount.toLocaleString()}</strong> / 50,000
          </span>
          {isTooLong && (
            <span className="flex items-center gap-1 text-[#E65B45] font-bold">
              <AlertCircle className="h-3.5 w-3.5" /> EXCEEDS LIMIT
            </span>
          )}
        </div>

        {/* Primary CTA Submit Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isEmpty && (
            <span className="font-mono text-[11px] text-[#71695D] hidden md:inline">
              [Enter code to analyze]
            </span>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || isEmpty || isTooLong}
            className="brutal-btn brutal-btn-primary w-full sm:w-auto px-6 py-2.5 text-sm tracking-wide bg-[#D7F36A]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-[#28251F] border-t-transparent rounded-full animate-spin" />
                DISSECTING CODE...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-[#28251F]" />
                DISSECT & REPAIR CODE
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
