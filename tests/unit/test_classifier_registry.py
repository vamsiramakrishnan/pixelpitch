from slidify.classifier.registry import ClassifierRegistry


class _Stage:
    def __init__(self, name: str, order: int, matched: bool):
        self.name = name
        self.order = order
        self._matched = matched

    def run(self, unit, context):
        return {"matched": self._matched, "reason_code": self.name}


def test_registry_uses_order_and_first_match():
    reg = ClassifierRegistry()
    reg.register(_Stage("late", 20, True))
    reg.register(_Stage("first", 10, True))

    out = reg.run({}, {})
    assert out["matched"] is True
    assert out["reason_code"] == "first"


def test_registry_returns_fallback_when_no_match():
    reg = ClassifierRegistry()
    reg.register(_Stage("none", 10, False))
    out = reg.run({}, {})
    assert out["matched"] is False
    assert out["fallback_path"] == "hybrid"
