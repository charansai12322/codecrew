export type ReviewFocus = 'general' | 'correctness' | 'security' | 'performance';

export interface ReviewRequest {
  code: string;
  language: string;
  focus: ReviewFocus;
}

export interface TokenUsageMetrics {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  agent_tokens?: Record<string, number> | null;
}

export interface ReviewResponse {
  request_id: string;
  status: 'completed' | 'partial' | 'failed' | 'configuration_required';
  language: string;
  focus: string;
  original_code: string;
  analysis_report: string | null;
  proposed_code: string | null;
  review_findings: string | null;
  syntax_valid: boolean | null;
  syntax_errors: string[];
  execution_time_seconds: number;
  error: string | null;
  provider: string;
  model: string;
  token_usage?: TokenUsageMetrics | null;
}

export interface HealthStatus {
  status: string;
  version: string;
  environment: string;
  llm_configured: boolean;
  provider?: string;
  model: string;
}

export type PipelineStage = 'idle' | 'validating' | 'analyzing' | 'debugging' | 'reviewing' | 'completed' | 'error';

