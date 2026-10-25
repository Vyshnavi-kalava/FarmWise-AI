from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.sql import func

from backend.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    __table_args__ = (
        CheckConstraint(
            "quantity_kg > 0",
            name="check_requirement_quantity_positive",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    farmer_id = Column(
        Integer,
        ForeignKey("farmers.id"),
        nullable=False,
        index=True,
    )

    crop_name = Column(String(100), nullable=False)
    crop_stage = Column(String(50), nullable=True)
    cultivated_area_acres = Column(Float, nullable=True)

    quantity_kg = Column(Integer, nullable=False)
    required_date = Column(Date, nullable=False)

    village = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)

    status = Column(
        String(30),
        default="pending",
        nullable=False,
        index=True,
    )

    notes = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )
