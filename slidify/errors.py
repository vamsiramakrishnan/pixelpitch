class SlidifyError(Exception):
    stage = "unknown"


class SourceError(SlidifyError):
    stage = "source"


class PlanningError(SlidifyError):
    stage = "planning"


class EmissionError(SlidifyError):
    stage = "emission"


class VerificationError(SlidifyError):
    stage = "verification"

