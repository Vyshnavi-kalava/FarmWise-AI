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


class Transaction(Base):
    __tablename__ = "transactions"

    __table_args__ = (
        CheckConstraint(
            "quantity_kg > 0",
            name="check_transaction_quantity_positive",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    inventory_id = Column(
        Integer,
        ForeignKey("inventory.id"),
        nullable=False,
        index=True,
    )

    transaction_type = Column(String(30), nullable=False)
    quantity_kg = Column(Integer, nullable=False)

    reference_number = Column(String(100), nullable=True)
    notes = Column(String(500), nullable=True)

    recorded_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    transaction_date = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
