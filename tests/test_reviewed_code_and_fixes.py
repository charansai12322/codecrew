import pytest

# --- REPRODUCTION OF ORIGINAL BUGGY FUNCTIONS FROM CELL 12 ---

def buggy_calculate_average(numbers):
    total = 0
    for i in range(len(numbers)):
        total += numbers[i + 1]
    avg = total / len(numbers)
    return avg

def buggy_find_max(numbers):
    max_val = 0
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val

def buggy_remove_duplicates(lst):
    for i in range(len(lst)):
        for j in range(i + 1, len(lst)):
            if lst[i] == lst[j]:
                lst.remove(lst[j])
    return lst


# --- CODE PRODUCED BY SENIOR_DEBUGGER IN CELL 13 OUTPUT ---

def fixed_calculate_average(numbers):
    # FIX: Added check for empty list to prevent ZeroDivisionError
    if not numbers:
        return 0.0
    total = 0
    # FIX: Changed loop access from numbers[i + 1] to numbers[i] to prevent IndexError and include index 0
    for i in range(len(numbers)):
        total += numbers[i]
    avg = total / len(numbers)
    return avg

def fixed_find_max(numbers):
    # FIX: Added check for empty list
    if not numbers:
        return None
    # FIX: Initialized max_val with the first element of numbers instead of 0 to support negative numbers
    max_val = numbers[0]
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val

def fixed_remove_duplicates(lst):
    # FIX: In-place removal during range-based iteration caused IndexError and skipped checks -> Constructed a new list preserving original order
    unique_lst = []
    for item in lst:
        if item not in unique_lst:
            unique_lst.append(item)
    return unique_lst


# --- AUDIT TESTS ---

class TestOriginalBuggyCodeDefects:
    """Audit tests proving that the notebook's sample input code has genuine critical bugs."""

    def test_buggy_calculate_average_index_error(self):
        """Proves Bug 1: IndexError due to numbers[i + 1] in calculate_average."""
        with pytest.raises(IndexError) as exc_info:
            buggy_calculate_average([3, 7, 2, 8, 2, 7, 4])
        assert "list index out of range" in str(exc_info.value)

    def test_buggy_calculate_average_zero_division(self):
        """Proves Bug 2: ZeroDivisionError on empty list in calculate_average."""
        with pytest.raises(ZeroDivisionError):
            buggy_calculate_average([])

    def test_buggy_find_max_negative_numbers(self):
        """Proves Bug 3: Logical error when all numbers are negative, returns 0 instead of -2."""
        result = buggy_find_max([-10, -5, -2, -20])
        assert result == 0, "Buggy implementation incorrectly returns 0 for all-negative lists"

    def test_buggy_remove_duplicates_mutation_error(self):
        """Proves Bug 5: In-place mutation during index iteration throws IndexError."""
        # For duplicates positioned near the end, lst.remove shrinks the list, causing index out of range
        with pytest.raises(IndexError):
            buggy_remove_duplicates([1, 2, 2, 3, 1, 4, 3, 5])


class TestSeniorDebuggerFixes:
    """Audit tests verifying Senior_Debugger's output correctness and edge case handling."""

    def test_fixed_calculate_average_normal(self):
        assert fixed_calculate_average([10, 20, 30, 40]) == 25.0
        assert fixed_calculate_average([3, 7, 2, 8, 2, 7, 4]) == pytest.approx(4.714, rel=1e-3)

    def test_fixed_calculate_average_empty(self):
        assert fixed_calculate_average([]) == 0.0

    def test_fixed_find_max_positive_and_negative(self):
        assert fixed_find_max([3, 7, 2, 8, 2, 7, 4]) == 8
        assert fixed_find_max([-10, -5, -2, -20]) == -2

    def test_fixed_find_max_empty(self):
        assert fixed_find_max([]) is None

    def test_fixed_remove_duplicates_order_and_uniqueness(self):
        input_data = [1, 2, 2, 3, 1, 4, 3, 5]
        result = fixed_remove_duplicates(input_data)
        assert result == [1, 2, 3, 4, 5]
        # Verify original input list was not mutated
        assert input_data == [1, 2, 2, 3, 1, 4, 3, 5]

    def test_remove_duplicates_complexity_limitation(self):
        """
        Verify that Senior_Debugger's fix works but has O(N^2) complexity limitation
        due to linear lookup `item not in unique_lst` rather than set-based lookup.
        """
        large_list = list(range(1000)) + list(range(500))
        result = fixed_remove_duplicates(large_list)
        assert len(result) == 1000
