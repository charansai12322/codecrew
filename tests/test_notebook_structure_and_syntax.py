import json
import ast
import re
from pathlib import Path
import pytest

NOTEBOOK_PATH = Path(__file__).resolve().parent.parent / "codereviewcrew.ipynb"

@pytest.fixture(scope="module")
def notebook_data():
    assert NOTEBOOK_PATH.exists(), f"Notebook file not found at {NOTEBOOK_PATH}"
    with open(NOTEBOOK_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def test_notebook_json_validity(notebook_data):
    """Verify that codereviewcrew.ipynb is valid JSON with standard nbformat structure."""
    assert "cells" in notebook_data, "Notebook missing 'cells' key"
    assert "metadata" in notebook_data, "Notebook missing 'metadata' key"
    assert notebook_data.get("nbformat") == 4, f"Expected nbformat 4, got {notebook_data.get('nbformat')}"

def test_notebook_cell_count_and_types(notebook_data):
    """Verify notebook cell distribution and identify shell magic cells."""
    cells = notebook_data["cells"]
    assert len(cells) == 14, f"Expected 14 cells, found {len(cells)}"
    
    cell_types = [c.get("cell_type") for c in cells]
    assert cell_types[0] == "markdown"
    assert all(t == "code" for t in cell_types[1:]), "Cells 1 through 13 should all be code cells"

def test_identify_pip_magic_commands(notebook_data):
    """Ensure shell pip installations are isolated to specific cells and not mixed in production code."""
    cells = notebook_data["cells"]
    pip_cells = []
    for idx, cell in enumerate(cells):
        if cell.get("cell_type") == "code":
            source = "".join(cell.get("source", []))
            if source.strip().startswith("!") or "!pip" in source:
                pip_cells.append((idx, source.strip()))
    
    assert len(pip_cells) == 3, f"Expected 3 pip install cells, found {len(pip_cells)}"
    pip_indices = [idx for idx, _ in pip_cells]
    assert pip_indices == [1, 2, 4], f"Pip cells found at unexpected indices: {pip_indices}"

def test_detect_colab_specific_dependencies(notebook_data):
    """Detect Colab-specific imports that break local execution (e.g., google.colab.userdata)."""
    cell_3_src = "".join(notebook_data["cells"][3].get("source", []))
    assert "from google.colab import userdata" in cell_3_src, "Cell 3 expected to contain google.colab import"
    assert "userdata.get('sec1')" in cell_3_src, "Cell 3 expected to query 'sec1' secret"

def test_cell_code_syntax_and_top_level_await(notebook_data):
    """Check code cells for standard Python syntax compilation and top-level await."""
    cells = notebook_data["cells"]
    
    # Cells 3, 5, 6, 7, 8, 9, 10, 11, 12 should be valid Python code
    standard_code_indices = [3, 5, 6, 7, 8, 9, 10, 11, 12]
    for idx in standard_code_indices:
        source = "".join(cells[idx].get("source", []))
        try:
            compile(source, f"<cell_{idx}>", "exec")
        except SyntaxError as e:
            pytest.fail(f"Cell {idx} failed standard compilation: {e}")
            
    # Cell 13 contains top-level await which fails standard exec compilation
    cell_13_src = "".join(cells[13].get("source", []))
    with pytest.raises(SyntaxError) as exc_info:
        compile(cell_13_src, "<cell_13>", "exec")
    assert "'await' outside async function" in str(exc_info.value) or "await" in str(exc_info.value)

def test_ast_detect_string_concatenation_flaws(notebook_data):
    """
    Detect implicit string literal concatenations without whitespace or newlines.
    In Python: "hello." "world" evaluates to "hello.world".
    """
    cells = notebook_data["cells"]
    flaws_found = []
    
    # Inspect Agent & Task definition cells
    target_cells = [3, 5, 6, 8, 9, 10]
    for idx in target_cells:
        source = "".join(cells[idx].get("source", []))
        
        # Check for adjacent string literals in source code
        # e.g., "..." \n "..."
        if 'backstory=\n      "You' in source or 'description=\n  "Take' in source or 'description=\n  "Using' in source or 'description=\n  "Review' in source:
            tree = ast.parse(source)
            for node in ast.walk(tree):
                if isinstance(node, ast.Constant) and isinstance(node.value, str):
                    val = node.value
                    if "conditionsKeep" in val:
                        flaws_found.append(f"Cell {idx}: 'conditionsKeep' run-together in backstory")
                    if "neededYou" in val:
                        flaws_found.append(f"Cell {idx}: 'neededYou' run-together in backstory")
                    if "practicesSuggest" in val:
                        flaws_found.append(f"Cell {idx}: 'practicesSuggest' run-together in backstory")
                    if "{buggy_code}1." in val:
                        flaws_found.append(f"Cell {idx}: '{{buggy_code}}1.' run-together in description")
                    if "taskFix" in val:
                        flaws_found.append(f"Cell {idx}: 'taskFix' run-together in description")
                    if "task.1." in val:
                        flaws_found.append(f"Cell {idx}: 'task.1.' run-together in description")
                    if "codeYour" in val:
                        flaws_found.append(f"Cell {idx}: 'codeYour' run-together in description")

    assert len(flaws_found) >= 5, f"Expected to identify multiple concatenated string flaws, found: {flaws_found}"

def test_detect_truncated_prompt_strings(notebook_data):
    """Flag truncated agent backstories: 'versio' (missing 'n') and abrupt 'output the FINAL'."""
    cells = notebook_data["cells"]
    
    cell_5_src = "".join(cells[5].get("source", []))
    assert "fixed versio" in cell_5_src, "Expected to find truncated word 'versio' in Cell 5"
    
    cell_6_src = "".join(cells[6].get("source", []))
    assert cell_6_src.strip().endswith('output the FINAL",\n    verbose=True,\n    llm=llm\n)') or 'output the FINAL"' in cell_6_src
