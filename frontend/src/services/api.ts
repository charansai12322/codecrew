import type { ReviewRequest, ReviewResponse, HealthStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const apiService = {
  /**
   * Check backend health and configuration readiness.
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new ApiError(`Health check failed with status ${response.status}`, response.status);
      }

      return await response.json();
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        'Unable to connect to backend service. Ensure backend is running at http://localhost:8000',
        0
      );
    }
  },

  /**
   * Submit code for multi-agent review and debugging.
   */
  async submitReview(request: ReviewRequest): Promise<ReviewResponse> {
    // Client-side guardrails
    if (!request.code || !request.code.trim()) {
      throw new ApiError('Please provide non-empty source code to review.', 400);
    }

    if (request.code.length > 50000) {
      throw new ApiError('Submitted code exceeds the maximum allowed size of 50,000 characters.', 413);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

      const response = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 422) {
        const errData = await response.json().catch(() => ({}));
        throw new ApiError(
          errData.detail || 'Validation error: invalid request fields.',
          422,
          errData.errors
        );
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new ApiError(
          errData.detail || `Server returned error (${response.status})`,
          response.status
        );
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new ApiError('Request timed out after 120 seconds. LLM provider took too long to respond.', 504);
      }
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        'Network error: Failed to reach Code Crew backend. Please ensure the server is running.',
        0
      );
    }
  },
};
