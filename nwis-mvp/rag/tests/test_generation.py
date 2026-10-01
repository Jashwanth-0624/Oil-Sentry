from rag.generation.generator import (
    GROUNDING_INSTRUCTIONS,
    LLM_REQUIRED_MESSAGE,
    NO_EVIDENCE_ANSWER,
    build_prompt,
    generate_answer,
)


def test_prompt_requires_grounding_from_evidence() -> None:
    prompt = build_prompt(
        "What happened in W005?",
        [
            {
                "well_id": "W005",
                "document_name": "W005_drilling_report.pdf",
                "page_number": 1,
                "chunk_index": 0,
                "similarity": 0.81,
                "content": "HIGH_TORQUE in Formation-A. Mitigation: adjusted WOB/RPM.",
            }
        ],
    )
    assert "Answer ONLY from the supplied retrieved evidence" in GROUNDING_INSTRUCTIONS
    assert "Do not invent" in prompt
    assert "W005_drilling_report.pdf" in prompt
    assert "HIGH_TORQUE" in prompt


def test_no_evidence_does_not_call_llm() -> None:
    result = generate_answer("What happened on Mars?", [])
    assert result["called_llm"] is False
    assert result["generation_status"] == "no_evidence"
    assert result["answer"] == NO_EVIDENCE_ANSWER


def test_missing_llm_key_does_not_fake_an_answer() -> None:
    result = generate_answer(
        "What happened in W005?",
        [
            {
                "well_id": "W005",
                "document_name": "W005_drilling_report.pdf",
                "page_number": 1,
                "chunk_index": 0,
                "content": "STUCK_PIPE recorded.",
            }
        ],
        provider="openai",
        api_key="",
    )
    assert result["called_llm"] is False
    assert result["generation_status"] == "llm_not_configured"
    assert result["answer"] == LLM_REQUIRED_MESSAGE
