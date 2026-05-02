from slidify.cli_schema import SCHEMA_VERSION, fail, ok


def test_ok_envelope_required_fields():
    payload = ok("convert", {"slides": 1}, ["echo done"])
    assert payload["schema_version"] == SCHEMA_VERSION
    assert payload["command"] == "convert"
    assert payload["status"] == "ok"
    assert payload["error"] is None
    assert payload["metrics"]["slides"] == 1
    assert payload["_next"]


def test_fail_envelope_required_fields():
    payload = fail("convert", "ValueError", "boom", "convert", ["retry"])
    assert payload["schema_version"] == SCHEMA_VERSION
    assert payload["status"] == "error"
    assert payload["error"]["type"] == "ValueError"
    assert payload["error"]["stage"] == "convert"
