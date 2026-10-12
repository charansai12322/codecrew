import ast
import re
from typing import Tuple, List, Optional

def extract_code_blocks(markdown_text: str) -> List[str]:
    """
    Extracts code blocks delimited by triple backticks from agent markdown responses.
    """
    if not markdown_text:
        return []
    pattern = re.compile(r"```(?:[a-zA-Z0-9_\-\+]*\n)?(.*?)```", re.DOTALL)
    matches = pattern.findall(markdown_text)
    if matches:
        return [m.strip() for m in matches if m.strip()]
    return [markdown_text.strip()]

def validate_python_syntax(code: str) -> Tuple[bool, List[str]]:
    """
    Performs safe, static AST syntax validation on Python source code.
    NEVER uses eval, exec, or arbitrary code execution.
    
    Returns:
        Tuple of (is_valid: bool, error_messages: List[str])
    """
    if not code or not code.strip():
        return False, ["Code is empty."]
    
    # If the text appears to be wrapped in markdown code blocks, test the code block contents
    candidate_code = code
    extracted = extract_code_blocks(code)
    if extracted:
        candidate_code = extracted[0]

    try:
        ast.parse(candidate_code)
        return True, []
    except SyntaxError as e:
        line_info = f"Line {e.lineno}" if e.lineno else "Unknown line"
        col_info = f", Column {e.offset}" if e.offset else ""
        error_msg = f"{line_info}{col_info}: {e.msg}"
        if e.text:
            error_msg += f" -> '{e.text.strip()}'"
        return False, [error_msg]
    except Exception as e:
        return False, [f"Syntax parsing failure: {str(e)}"]
