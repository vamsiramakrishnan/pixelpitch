from slidify.cli.exit_codes import QUALITY_GATE_FAILED, RECOVERABLE_ERROR, SUCCESS


def test_exit_codes_are_stable():
    assert SUCCESS == 0
    assert RECOVERABLE_ERROR == 2
    assert QUALITY_GATE_FAILED == 3
