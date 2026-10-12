import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiService,
  resolveApiUrl,
  getApiBaseUrl,
  PRODUCTION_API_URL,
} from '../src/services/api';
import { COLAB_SAMPLE_CODE } from '../src/components/editor/CodeEditor';

describe('Frontend API Service Guardrails & Routing Contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL Resolution & /api Prefix Normalization', () => {
    it('normalizes base URL without trailing slash', () => {
      const url = resolveApiUrl('/api/health', 'https://codecrew-plzo.onrender.com');
      expect(url).toBe('https://codecrew-plzo.onrender.com/api/health');
    });

    it('strips trailing slashes from base URL to prevent double slashes //api/health', () => {
      const url = resolveApiUrl('/api/health', 'https://codecrew-plzo.onrender.com/');
      expect(url).toBe('https://codecrew-plzo.onrender.com/api/health');
      expect(url).not.toContain('//api');
    });

    it('prevents duplicate /api prefixes when base URL already ends with /api', () => {
      const url = resolveApiUrl('/api/health', 'https://codecrew-plzo.onrender.com/api');
      expect(url).toBe('https://codecrew-plzo.onrender.com/api/health');
      expect(url).not.toContain('/api/api');
    });

    it('handles base URL ending with /api/ and endpoint with /api/health', () => {
      const url = resolveApiUrl('/api/health', 'https://codecrew-plzo.onrender.com/api/');
      expect(url).toBe('https://codecrew-plzo.onrender.com/api/health');
      expect(url).not.toContain('/api/api');
      expect(url).not.toContain('//api');
    });

    it('handles endpoints without leading slashes', () => {
      const url = resolveApiUrl('api/health', 'https://codecrew-plzo.onrender.com');
      expect(url).toBe('https://codecrew-plzo.onrender.com/api/health');
    });

    it('resolves non-api routes such as /docs correctly', () => {
      const url = resolveApiUrl('/docs', 'https://codecrew-plzo.onrender.com');
      expect(url).toBe('https://codecrew-plzo.onrender.com/docs');
    });

    it('returns clean relative path when base URL is empty', () => {
      const url = resolveApiUrl('/api/health', '');
      expect(url).toBe('/api/health');
    });

    it('falls back to canonical Render backend if VITE_API_BASE_URL erroneously matches window origin', () => {
      // Simulates the production bug where Vercel origin was assigned to VITE_API_BASE_URL
      const originalWindow = global.window;
      // @ts-expect-error mock window
      global.window = { location: { origin: 'https://codecrew-lemon-sigma.vercel.app' } };

      const base = getApiBaseUrl('https://codecrew-lemon-sigma.vercel.app');
      expect(base).toBe(PRODUCTION_API_URL);

      global.window = originalWindow;
    });
  });

  describe('Client-Side Request Validation', () => {
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
  });

  describe('Health Check API Contract', () => {
    it('calls the backend /api/health endpoint and returns valid health status', async () => {
      const mockHealth = {
        status: 'ok',
        version: '1.0.0',
        environment: 'development',
        llm_configured: true,
        provider: 'GroqCloud',
        model: 'openai/gpt-oss-120b',
      };

      let requestedUrl = '';
      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => mockHealth,
        });
      });

      const result = await apiService.checkHealth();
      expect(requestedUrl).toMatch(/\/api\/health$/);
      expect(result.status).toBe('ok');
      expect(result.llm_configured).toBe(true);
      expect(result.model).toBe('openai/gpt-oss-120b');
    });

    it('maps network connection errors to user-friendly message without hardcoding localhost', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(apiService.checkHealth()).rejects.toThrow(
        'Unable to connect to backend service'
      );
    });

    it('throws ApiError with HTTP status code when response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(apiService.checkHealth()).rejects.toThrow(
        'Health check failed with status 404'
      );
    });
  });

  describe('Code Review Submission API Contract', () => {
    it('calls /api/review endpoint with valid POST payload', async () => {
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

      let requestedUrl = '';
      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => mockResponse,
        });
      });

      const result = await apiService.submitReview({
        code: 'def foo(): pass',
        language: 'python',
        focus: 'correctness',
      });

      expect(requestedUrl).toMatch(/\/api\/review$/);
      expect(result.status).toBe('completed');
      expect(result.proposed_code).toBe('def foo(): return True');
      expect(result.model).toBe('openai/gpt-oss-120b');
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
  });

  describe('Colab Sample Presets', () => {
    it('contains the complete Colab sample code snippet with known bugs', () => {
      expect(COLAB_SAMPLE_CODE).toContain('def calculate_average(numbers):');
      expect(COLAB_SAMPLE_CODE).toContain('def find_max(numbers):');
      expect(COLAB_SAMPLE_CODE).toContain('def remove_duplicates(lst):');
      expect(COLAB_SAMPLE_CODE).toContain('numbers[i + 1]');
    });
  });
});
