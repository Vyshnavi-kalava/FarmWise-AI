from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.sql import func

from backend.database import Base


class Distribution(Base):
    __tablename__ = "distributions"

    __table_args__ = (
        CheckConstraint(
            "quantity_kg > 0",
            name="check_distribution_quantity_positive",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    source_store_id = Column(
        Integer,
        ForeignKey("stores.id"),
        nullable=False,
        index=True,
    )

    destination_store_id = Column(
        Integer,
        ForeignKey("stores.id"),
        nullable=False,
        index=True,
    )

    quantity_kg = Column(Integer, nullable=False)

    status = Column(
        String(30),
        default="proposed",
        nullable=False,
        index=True,
    )

    reason = Column(String(1000), nullable=True)
    transport_details = Column(String(500), nullable=True)

    proposed_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    approved_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    proposed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    approved_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
