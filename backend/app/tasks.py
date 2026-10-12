"""
Code Crew - Task Definitions
Explicitly wires sequential tasks and inter-agent context dependencies.
"""

from typing import List
from crewai import Task, Agent

def create_analyze_task(
    agent: Agent,
    code: str,
    language: str = "python",
    focus: str = "general"
) -> Task:
    """
    Task 1: Bug Analysis
    Analyzes user-submitted code for defects, root causes, and edge cases concisely.
    """
    description = f"""Analyze the submitted {language} code (Review Focus: {focus}).

Source code:
```{language}
{code}
```

Instructions:
1. Identify all confirmed bugs: syntax, runtime, and logical defects.
2. Focus specifically on '{focus}'.
3. Format as a concise, structured report without repeating full source code.

Output format:
## Bug Analysis Report
- **Summary:** [1-2 sentences on intent and core defect]
- **Defects:**
  - **[Line/Location]:** [Defect] -> [Root Cause] (Severity: High/Medium/Low)
- **Fix Constraints:** [Key logic to preserve]
"""
    return Task(
        description=description,
        expected_output="A concise structured Bug Analysis Report listing confirmed issues and fix constraints.",
        agent=agent
    )

def create_fix_task(
    agent: Agent,
    analyze_task: Task,
    code: str,
    language: str = "python"
) -> Task:
    """
    Task 2: Code Debugging & Fixing
    Consumes the bug analysis report and original code to produce a clean, runnable fix.
    """
    description = f"""Using the Bug Analysis Report and original code, fix all confirmed defects and produce clean, working {language} code.

Original code:
```{language}
{code}
```

Requirements:
- Fix every confirmed defect from the analysis report.
- Add an inline comment above each fix: `# FIX: [issue] -> [change]`.
- Maintain original structure, naming, and interface.
- Provide complete, runnable code in a markdown block (```{language} ... ```).
- Include a concise 2-3 bullet fix summary.
"""
    return Task(
        description=description,
        expected_output=f"A complete, runnable fixed {language} script with explanatory fix comments and concise summary.",
        agent=agent,
        context=[analyze_task]
    )

def create_review_task(
    agent: Agent,
    analyze_task: Task,
    fix_task: Task,
    code: str,
    language: str = "python",
    focus: str = "general"
) -> Task:
    """
    Task 3: Independent Code Review & Verification
    Consumes original code, analysis, and fix to independently verify the solution.
    """
    description = f"""Review and independently verify the proposed fix against the original code and analysis (Focus: {focus}).

Original code:
```{language}
{code}
```

Instructions:
1. Verify that each defect was genuinely resolved without introducing new regressions.
2. Check boundary conditions and edge cases.
3. Formulate the final review verdict and verified code.

Output format:
## Independent Review Verdict
- **Verification Status:** [VERIFIED / PARTIALLY VERIFIED / DEFECTS REMAINING]
- **Bug Fix Verification Checklist:**
  - [x] Bug 1: [Status and notes]
- **Edge Cases Checked:** [Details on boundary conditions evaluated]
- **Remaining Risks or Suggestions:** [Any non-blocking notes]

### Final Verified Code
```{language}
[Complete, verified code]
```
"""
    return Task(
        description=description,
        expected_output="Final verification report with fix checklist, edge case evaluation, and final verified code block.",
        agent=agent,
        context=[analyze_task, fix_task]
    )
