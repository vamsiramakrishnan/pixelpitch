from slidify.pipeline.execution import ExecutionResult
from slidify.pipeline.planning import StagePlan
from slidify.pipeline.verification import VerificationResult


def test_pipeline_stage_models_defaults():
    plan = StagePlan(slide_index=2)
    assert plan.slide_index == 2
    assert plan.units == []

    run = ExecutionResult(slide_index=2)
    assert run.emitted_ops == []

    verify = VerificationResult(slide_index=2, passed=True)
    assert verify.passed is True
