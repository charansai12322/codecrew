import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SideBySideComparison } from '../src/components/results/SideBySideComparison';
import { ResultsView } from '../src/components/results/ResultsView';
import type { ReviewResponse } from '../src/types';

describe('SideBySideComparison & Copy Corrected Code Suite', () => {
  const sampleOriginal = `def calculate_average(nums):
    total = sum(nums)
    return total / len(nums)`;

  const sampleProposed = `def calculate_average(nums):
    # FIX: Guard against ZeroDivisionError on empty collections
    if not nums:
        return 0.0
    return sum(nums) / len(nums)`;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders both code panels with correct original and proposed source', () => {
    render(
      <SideBySideComparison
        originalCode={sampleOriginal}
        proposedCode={sampleProposed}
        language="python"
      />
    );

    expect(screen.getByText('ORIGINAL VS. PROPOSED FIX')).toBeDefined();
    expect(screen.getByText('[-] ORIGINAL CODE')).toBeDefined();
    expect(screen.getByText('[+] PROPOSED FIX')).toBeDefined();

    // Verify raw code is present in both panels
    const codeMatches = screen.getAllByText(/def calculate_average\(nums\):/);
    expect(codeMatches.length).toBe(2);
    expect(screen.getByText(/# FIX: Guard against ZeroDivisionError/)).toBeDefined();
  });

  it('copies EXACT raw proposed code to clipboard, preserving indentation and newlines', async () => {
    let copiedText = '';
    const writeTextMock = vi.fn().mockImplementation(async (text: string) => {
      copiedText = text;
      return Promise.resolve();
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
      writable: true,
    });

    render(
      <SideBySideComparison
        originalCode={sampleOriginal}
        proposedCode={sampleProposed}
        language="python"
      />
    );

    const copyButtons = screen.getAllByRole('button', { name: /copy corrected code/i });
    const primaryCopyBtn = copyButtons[0];
    fireEvent.click(primaryCopyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(copiedText).toBe(sampleProposed);

    // Strict verifications:
    // 1. Exactly matches the proposed code
    expect(copiedText).toContain('    # FIX: Guard against ZeroDivisionError on empty collections');
    expect(copiedText).toContain('\n    if not nums:\n        return 0.0');
    // 2. Contains NO line numbers, UI headers, badges, or buttons
    expect(copiedText).not.toContain('[-] ORIGINAL CODE');
    expect(copiedText).not.toContain('[+] PROPOSED FIX');
    expect(copiedText).not.toContain('SUBMITTED INPUT');
    expect(copiedText).not.toContain('1\n2\n3');
    expect(copiedText).not.toContain('DIFF INSPECTION');

    // Button updates to success feedback
    await waitFor(() => {
      expect(screen.getByText(/copied!/i)).toBeDefined();
    });

    // Screen reader announcement
    const liveRegion = screen.getByText(/corrected code copied to clipboard/i);
    expect(liveRegion).toBeDefined();
  });

  it('secondary copy icon in Proposed Fix panel header also copies exact raw code', async () => {
    let copiedText = '';
    const writeTextMock = vi.fn().mockImplementation(async (text: string) => {
      copiedText = text;
      return Promise.resolve();
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
      writable: true,
    });

    render(
      <SideBySideComparison
        originalCode={sampleOriginal}
        proposedCode={sampleProposed}
      />
    );

    const headerCopyButtons = screen.getAllByRole('button', { name: /copy corrected code/i });
    // The second button is the icon-only header button
    expect(headerCopyButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(headerCopyButtons[1]);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(copiedText).toBe(sampleProposed);

    await waitFor(() => {
      expect(screen.getByText(/copied!/i)).toBeDefined();
    });
  });

  it('handles clipboard failure gracefully and presents understandable error feedback', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard permission denied'));

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
      writable: true,
    });

    // Also simulate execCommand failing
    document.execCommand = vi.fn().mockReturnValue(false);

    render(
      <SideBySideComparison
        originalCode={sampleOriginal}
        proposedCode={sampleProposed}
      />
    );

    const copyButtons = screen.getAllByRole('button', { name: /copy corrected code/i });
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/^copy failed$/i)).toBeDefined();
      const msgs = screen.getAllByText(/please select and copy code manually/i);
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });

    // Verify it did not claim success
    expect(screen.queryByText(/copied!/i)).toBeNull();
  });

  it('handles missing or empty proposed code safely without copying or throwing', async () => {
    const writeTextMock = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(
      <SideBySideComparison
        originalCode={sampleOriginal}
        proposedCode=""
      />
    );

    const copyBtn = screen.getByRole('button', { name: /copy corrected code/i });
    expect(copyBtn.getAttribute('disabled')).not.toBeNull();

    fireEvent.click(copyBtn);
    expect(writeTextMock).not.toHaveBeenCalled();

    expect(
      screen.getByText(/no proposed fix was generated by the debugging agent\./i)
    ).toBeDefined();
  });

  it('toggles layout modes between SPLIT (columns) and STACKED (rows)', () => {
    const { container } = render(
      <SideBySideComparison
        originalCode={sampleOriginal}
        proposedCode={sampleProposed}
      />
    );

    // Initial default: columns (grid-cols-1 md:grid-cols-2)
    const splitBtn = screen.getByRole('button', { name: /side-by-side columns view/i });
    const stackedBtn = screen.getByRole('button', { name: /stacked rows view/i });

    expect(container.querySelector('.grid-cols-1.md\\:grid-cols-2')).not.toBeNull();

    // Click Stacked
    fireEvent.click(stackedBtn);
    expect(container.querySelector('.flex-col.space-y-4')).not.toBeNull();

    // Click Split back
    fireEvent.click(splitBtn);
    expect(container.querySelector('.grid-cols-1.md\\:grid-cols-2')).not.toBeNull();
  });

  it('invokes onToggleExpand callback when expand button is activated', () => {
    const onToggleExpand = vi.fn();
    render(
      <SideBySideComparison
        originalCode={sampleOriginal}
        proposedCode={sampleProposed}
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      />
    );

    const expandBtn = screen.getByRole('button', { name: /expand comparison to full width/i });
    fireEvent.click(expandBtn);
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });
});

describe('ResultsView Tabs & Integration Suite', () => {
  const mockResult: ReviewResponse = {
    status: 'success',
    proposed_code: 'def foo():\n    return 42',
    analysis_report: 'Defect Analysis: Missing return guard',
    review_findings: 'Verification Verdict: PASSED all 4 edge cases',
    request_id: 'TEST-REQ-001',
    language: 'python',
    focus: 'correctness',
    model: 'openai/gpt-oss-120b',
  };

  it('allows seamless switching across all 4 results tabs including diff', () => {
    render(
      <ResultsView
        result={mockResult}
        isLoading={false}
        originalCode="def foo():\n    pass"
      />
    );

    // Tab 1: Proposed Fix is active by default
    expect(screen.getByText('AGENT 2: SENIOR_DEBUGGER // REPAIRED CODE')).toBeDefined();

    // Switch to Tab 2: Analysis Report
    const analysisTab = screen.getByRole('button', { name: /analysis report/i });
    fireEvent.click(analysisTab);
    expect(screen.getByText('AGENT 1: CODE_ANALYZER // ROOT CAUSE DIAGNOSIS')).toBeDefined();
    expect(screen.getByText(/Missing return guard/)).toBeDefined();

    // Switch to Tab 3: Verification
    const verificationTab = screen.getByRole('button', { name: /verification/i });
    fireEvent.click(verificationTab);
    expect(screen.getByText('AGENT 3: CODE_REVIEWER // TEST MATRIX & VERDICT')).toBeDefined();
    expect(screen.getByText(/PASSED all 4 edge cases/)).toBeDefined();

    // Switch to Tab 4: Side-by-Side Diff
    const diffTab = screen.getByRole('button', { name: /side-by-side/i });
    fireEvent.click(diffTab);
    expect(screen.getByText('ORIGINAL VS. PROPOSED FIX')).toBeDefined();
    expect(screen.getByText('[-] ORIGINAL CODE')).toBeDefined();
    expect(screen.getByText('[+] PROPOSED FIX')).toBeDefined();

    // Can switch back to Proposed Fix
    const fixTab = screen.getByRole('button', { name: /proposed fix/i });
    fireEvent.click(fixTab);
    expect(screen.getByText('AGENT 2: SENIOR_DEBUGGER // REPAIRED CODE')).toBeDefined();
  });
});
