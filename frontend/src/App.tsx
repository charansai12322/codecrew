import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CodeEditor, COLAB_SAMPLE_CODE } from './components/editor/CodeEditor';
import { PipelineStages } from './components/pipeline/PipelineStages';
import { ResultsView } from './components/results/ResultsView';
import { AlertBanner } from './components/ui/AlertBanner';
import { Footer } from './components/Footer';
import { apiService, ApiError } from './services/api';
import type { ReviewFocus, ReviewResponse, HealthStatus } from './types';

export function App() {
  const [code, setCode] = useState<string>(COLAB_SAMPLE_CODE);
  const [language, setLanguage] = useState<string>('python');
  const [focus, setFocus] = useState<ReviewFocus>('correctness');
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [isComparisonExpanded, setIsComparisonExpanded] = useState<boolean>(false);

  // Poll backend health on initial load
  useEffect(() => {
    let isMounted = true;
    apiService
      .checkHealth()
      .then((data) => {
        if (isMounted) {
          setHealth(data);
          setHealthLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Backend health check notice:', err);
          setHealth(null);
          setHealthLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) {
      setError('Please provide non-empty source code to review.');
      return;
    }

    if (code.length > 50000) {
      setError('Submitted code exceeds the maximum allowed size of 50,000 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.submitReview({
        code,
        language,
        focus,
      });

      setResult(response);

      if (response.status === 'configuration_required') {
        setError(response.error);
      } else if (response.status === 'failed') {
        setError(response.error || 'The Crew review process failed.');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while communicating with the review backend.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [code, language, focus]);

  // Global Keyboard Shortcut: [Ctrl + Enter] or [Cmd + Enter]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading && code.trim()) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isLoading, code]);

  return (
    <div className="min-h-screen bg-[#F1E8D6] text-[#28251F] flex flex-col font-sans selection:bg-[#D7F36A] selection:text-[#28251F]">
      {/* Sticky Compact Header */}
      <Header health={health} healthLoading={healthLoading} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col space-y-6">
        {/* Archival Brutalist Hero */}
        <Hero />

        {/* Configuration Notice if LLM key is unconfigured */}
        {health && !health.llm_configured && (
          <AlertBanner
            type="warning"
            title="LLM Provider Configuration Required"
            message="The Code Crew backend is running, but GROQ_API_KEY is not configured in backend/.env. Live 3-agent analysis requires an active Groq API key."
          />
        )}

        {/* Runtime Error Banner */}
        {error && (
          <AlertBanner
            type="error"
            title="Review Workflow Notice"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Expanded Mode Notice Banner */}
        {isComparisonExpanded && (
          <div className="flex items-center justify-between p-3 border-2 border-[#28251F] bg-[#F1E8D6] shadow-[2px_2px_0px_#28251F]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#28251F] uppercase">
                // EXPANDED WORKBENCH VIEW
              </span>
              <span className="text-xs text-[#71695D] font-mono hidden sm:inline">
                Code comparison expanded to full container width for enhanced legibility.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsComparisonExpanded(false)}
              className="brutal-btn brutal-btn-secondary text-xs px-2.5 py-1 bg-[#FFFCF4]"
            >
              RESTORE SPLIT
            </button>
          </div>
        )}

        {/* Main 2-Column Split Workbench or Expanded Mode */}
        <div className={`grid grid-cols-1 ${isComparisonExpanded ? '' : 'lg:grid-cols-2'} gap-6 items-stretch`}>
          {/* Left Column: Code Editor */}
          {!isComparisonExpanded && (
            <div className="flex flex-col h-full">
              <CodeEditor
                code={code}
                setCode={setCode}
                language={language}
                setLanguage={setLanguage}
                focus={focus}
                setFocus={setFocus}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Right Column: Results & Verification */}
          <div className={`flex flex-col h-full ${isComparisonExpanded ? 'w-full' : ''}`}>
            <ResultsView
              result={result}
              isLoading={isLoading}
              originalCode={code}
              isExpanded={isComparisonExpanded}
              onToggleExpand={() => setIsComparisonExpanded((prev) => !prev)}
            />
          </div>
        </div>

        {/* Pipeline Architecture Stage Panel */}
        <div className="pt-2">
          <PipelineStages
            isLoading={isLoading}
            result={result}
            error={error}
          />
        </div>
      </main>

      {/* Minimal Editorial Footer */}
      <Footer />
    </div>
  );
}

export default App;
