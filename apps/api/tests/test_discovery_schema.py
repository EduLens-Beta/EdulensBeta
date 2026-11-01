import pytest
from pydantic import ValidationError

from app.learning.discovery_schemas import SaveDiscoveryRequest
from app.learning.science_v2 import MILESTONES


def completed_payload():
    return {
        "interests": ["nature"],
        "unsure": False,
        "activity_id": "notice-and-question",
        "work_text": "I noticed patterns in leaves and wrote a question.",
        "reflection": "I enjoyed observing details and want to explore more.",
        "complete": True,
    }


def test_incomplete_draft_is_allowed():
    result = SaveDiscoveryRequest.model_validate({})
    assert result.complete is False
    assert result.interests == []


def test_student_can_complete_with_an_interest():
    result = SaveDiscoveryRequest.model_validate(completed_payload())
    assert result.interests == ["nature"]
    assert result.complete is True


def test_unsure_student_can_complete_exploration():
    payload = completed_payload()
    payload.update(interests=[], unsure=True)
    result = SaveDiscoveryRequest.model_validate(payload)
    assert result.unsure is True


@pytest.mark.parametrize(
    "changes",
    [
        {"interests": []},
        {"interests": ["nature", "nature"]},
        {"interests": ["nature"], "unsure": True},
        {"interests": ["unknown"]},
        {"interests": ["nature", "technology", "health", "data"]},
        {"activity_id": None},
        {"activity_id": "unknown"},
        {"work_text": "short"},
        {"reflection": "   "},
        {"complete": "true"},
        {"awarded_xp": 1000},
        {"user_id": "another-account"},
    ],
)
def test_invalid_completion_is_rejected(changes):
    payload = completed_payload()
    payload.update(changes)
    with pytest.raises(ValidationError):
        SaveDiscoveryRequest.model_validate(payload)


def test_roadmap_has_six_unique_milestones():
    assert len(MILESTONES) == 6
    assert len({item.id for item in MILESTONES}) == 6
    assert MILESTONES[0].id == "discover-interests"
    assert all(item.xp > 0 for item in MILESTONES)
