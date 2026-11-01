from dataclasses import dataclass


ROADMAP_ID = "science-explorer"
ROADMAP_VERSION = 2


@dataclass(frozen=True)
class Milestone:
    id: str
    title: str
    skill: str
    xp: int


MILESTONES = (
    Milestone(
        "discover-interests", "Discover my interests",
        "Self-reflection", 25,
    ),
    Milestone(
        "ask-a-question", "Ask a good question",
        "Research and critical thinking", 25,
    ),
    Milestone(
        "work-with-information", "Work with information",
        "Data literacy", 25,
    ),
    Milestone(
        "build-a-project", "Make a small project",
        "Problem-solving", 25,
    ),
    Milestone(
        "explain-my-work", "Explain my work",
        "Communication", 25,
    ),
    Milestone(
        "choose-next-direction", "Choose my next direction",
        "Reflection and planning", 25,
    ),
)

INTERESTS = (
    {"id": "nature", "label": "Nature and the environment"},
    {"id": "technology", "label": "Technology and coding"},
    {"id": "health", "label": "Health and helping people"},
    {"id": "building", "label": "Building and designing things"},
    {"id": "communication", "label": "Explaining ideas and storytelling"},
    {"id": "data", "label": "Numbers, patterns, and data"},
)

EXPLORATION_ACTIVITIES = (
    {
        "id": "notice-and-question",
        "title": "Notice something. Ask a question.",
        "instruction": (
            "Choose something familiar around you. Write three things you "
            "notice and one question you would like to explore. "
            "Observing is enough; no experiment or special equipment is needed."
        ),
    },
    {
        "id": "explain-an-idea",
        "title": "Explain an idea simply.",
        "instruction": (
            "Choose an idea you find interesting. Explain it in five simple "
            "sentences, or describe a drawing you made to explain it."
        ),
    },
    {
        "id": "design-a-solution",
        "title": "Sketch a helpful idea.",
        "instruction": (
            "Think of a small everyday problem. Sketch a possible solution "
            "on paper and describe who it could help."
        ),
    },
)
