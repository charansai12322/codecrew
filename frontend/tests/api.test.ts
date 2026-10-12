import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from '../src/services/api';
import { COLAB_SAMPLE_CODE } from '../src/components/editor/CodeEditor';

describe('Frontend API Service Guardrails & Contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects empty code submission before making network requests', async () => {
    await expect(
      apiService.submitReview({
        code: '',
        language: 'python',
        focus: 'general',
      })
    ).rejects.toThrow('Please provide non-empty source code to review.');

    await expect(
      apiService.submitReview({
        code: '   \n\t  ',
        language: 'python',
        focus: 'general',
      })
    ).rejects.toThrow('Please provide non-empty source code to review.');
  });

  it('rejects oversized code submissions exceeding 50,000 characters', async () => {
    const hugeCode = 'x = 1\n'.repeat(15000); // > 90k chars
    await expect(
      apiService.submitReview({
        code: hugeCode,
        language: 'python',
        focus: 'general',
      })
    ).rejects.toThrow('Submitted code exceeds the maximum allowed size');
  });

  it('handles backend health check success', async () => {
    const mockHealth = {
      status: 'ok',
      version: '1.0.0',
      environment: 'development',
      llm_configured: true,
      provider: 'GroqCloud',
      model: 'openai/gpt-oss-120b',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    });

    const result = await apiService.checkHealth();
    expect(result.status).toBe('ok');
    expect(result.llm_configured).toBe(true);
    expect(result.model).toBe('openai/gpt-oss-120b');
  });

  it('maps network connection errors to user-friendly message', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(apiService.checkHealth()).rejects.toThrow(
      'Unable to connect to backend service'
    );
  });

  it('parses HTTP 422 validation error detail from backend', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 422,
      ok: false,
      json: async () => ({
        detail: 'Request validation failed',
        errors: ['body -> focus: Input should be valid focus'],
      }),
    });

    await expect(
      apiService.submitReview({
        code: 'def foo(): pass',
        language: 'python',
        focus: 'general',
      })
    ).rejects.toThrow('Request validation failed');
  });

  it('handles successful code review response payload', async () => {
    const mockResponse = {
      request_id: 'test-uuid-123',
      status: 'completed',
      language: 'python',
      focus: 'correctness',
      original_code: 'def foo(): pass',
      analysis_report: 'Analysis',
      proposed_code: 'def foo(): return True',
      review_findings: 'Verdict',
      syntax_valid: true,
      syntax_errors: [],
      execution_time_seconds: 2.5,
      error: null,
      provider: 'GroqCloud',
      model: 'openai/gpt-oss-120b',
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiService.submitReview({
      code: 'def foo(): pass',
      language: 'python',
      focus: 'correctness',
    });

    expect(result.status).toBe('completed');
    expect(result.proposed_code).toBe('def foo(): return True');
    expect(result.model).toBe('openai/gpt-oss-120b');
  });

  it('contains the complete Colab sample code snippet with known bugs', () => {
    expect(COLAB_SAMPLE_CODE).toContain('def calculate_average(numbers):');
    expect(COLAB_SAMPLE_CODE).toContain('def find_max(numbers):');
    expect(COLAB_SAMPLE_CODE).toContain('def remove_duplicates(lst):');
    expect(COLAB_SAMPLE_CODE).toContain('numbers[i + 1]');
  });
});
