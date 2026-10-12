import type { ReviewRequest, ReviewResponse, HealthStatus } from '../types';

/**
 * Canonical production backend URL on Render.
 */
export const PRODUCTION_API_URL = 'https://codecrew-plzo.onrender.com';

/**
 * Resolves the base URL for the backend API.
 * - In development mode, defaults to 'http://localhost:8000'
 * - In production mode, if VITE_API_BASE_URL is not set or erroneously points to the frontend host,
 *   defaults to PRODUCTION_API_URL ('https://codecrew-plzo.onrender.com')
 */
export function getApiBaseUrl(customEnvUrl?: string): string {
  const envUrl = (customEnvUrl !== undefined ? customEnvUrl : (import.meta.env.VITE_API_BASE_URL || '')).trim();

  if (envUrl) {
    // Guard against misconfiguration where Vercel URL was assigned to VITE_API_BASE_URL:
    // If the configured URL matches the current window's origin (e.g. https://codecrew-lemon-sigma.vercel.app),
    // and there is no local backend server running on that origin, redirect to canonical backend.
    if (typeof window !== 'undefined' && (envUrl === window.location.origin || envUrl.includes('vercel.app'))) {
      return PRODUCTION_API_URL;
    }
    return envUrl;
  }

  // Development default
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }

  // Production default
  return PRODUCTION_API_URL;
}

/**
 * Resolves and normalizes an API endpoint URL against the base URL.
 * Guarantees:
 * - Strips any trailing slashes from the base URL (prevents double slash '//api/...')
 * - Prevents duplicate '/api' prefix (e.g. base '.../api' + path '/api/health' -> '.../api/health')
 * - Normalizes leading and trailing slashes on endpoint paths
 */
export function resolveApiUrl(endpoint: string, customBase?: string): string {
  const base = (customBase !== undefined ? customBase : getApiBaseUrl()).trim();
  const cleanBase = base.replace(/\/+$/, '');
  let cleanPath = endpoint.replace(/^\/+/, '').replace(/\/+$/, '');

  // If base already ends with '/api' (or is '/api')
  if (cleanBase.endsWith('/api')) {
    if (cleanPath === 'api') {
      cleanPath = '';
    } else if (cleanPath.startsWith('api/')) {
      cleanPath = cleanPath.slice(4);
    }
  }

  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
}

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
    const healthUrl = resolveApiUrl('/api/health');
    try {
      const response = await fetch(healthUrl, {
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
        'Unable to connect to backend service. Ensure backend is running and reachable.',
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

    const reviewUrl = resolveApiUrl('/api/review');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

      const response = await fetch(reviewUrl, {
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
