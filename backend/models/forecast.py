from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    Integer,
    String,
)
from sqlalchemy.sql import func

from backend.database import Base


class Forecast(Base):
    __tablename__ = "forecasts"

    __table_args__ = (
        CheckConstraint(
            "predicted_demand_kg >= 0",
            name="check_forecast_demand_nonnegative",
        ),
        CheckConstraint(
            "confidence_score IS NULL OR "
            "(confidence_score >= 0 AND confidence_score <= 1)",
            name="check_forecast_confidence_range",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    crop_name = Column(String(100), nullable=True)

    forecast_date = Column(Date, nullable=False, index=True)

    predicted_demand_kg = Column(Float, nullable=False)
    estimated_supply_kg = Column(Float, nullable=True)

    shortage_risk = Column(
        String(20),
        nullable=False,
        default="unknown",
    )

    confidence_score = Column(Float, nullable=True)
    model_name = Column(String(100), nullable=True)

    explanation = Column(String(1000), nullable=True)

    generated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
