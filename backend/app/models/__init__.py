"""ORM models package — import all to ensure they're registered with SQLAlchemy metadata."""
from app.models.user import User, RefreshToken
from app.models.case import (
    CaseCategory, Case, CaseKeyword, CaseLandlordScript, CaseLegalBasis,
    CaseActionStep, CaseTemplate, CaseComplaintChannel, CaseOutcomeExample,
    CaseEvidenceNeeded, CaseSubmission,
)
from app.models.chat import ChatSession, ChatMessage
from app.models.progress import ProgressTracker, ProgressEvent
from app.models.misc import (
    BlacklistEntry, City, CityPolicy, CityContact, CityVerdict,
    GeneratedDocument, DepositCalculation,
)

__all__ = [
    "User", "RefreshToken",
    "CaseCategory", "Case", "CaseKeyword", "CaseLandlordScript",
    "CaseLegalBasis", "CaseActionStep", "CaseTemplate",
    "CaseComplaintChannel", "CaseOutcomeExample", "CaseEvidenceNeeded",
    "CaseSubmission",
    "ChatSession", "ChatMessage",
    "ProgressTracker", "ProgressEvent",
    "BlacklistEntry", "City", "CityPolicy", "CityContact", "CityVerdict",
    "GeneratedDocument", "DepositCalculation",
]
