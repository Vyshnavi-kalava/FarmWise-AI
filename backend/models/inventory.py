from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.sql import func

from backend.database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    __table_args__ = (
        CheckConstraint(
            "quantity_kg >= 0",
            name="check_inventory_quantity_nonnegative",
        ),
        CheckConstraint(
            "reserved_quantity_kg >= 0",
            name="check_reserved_quantity_nonnegative",
        ),
        CheckConstraint(
            "reserved_quantity_kg <= quantity_kg",
            name="check_reserved_not_above_stock",
        ),
        CheckConstraint(
            "price_per_kg >= 0",
            name="check_inventory_price_nonnegative",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(
        Integer,
        ForeignKey("stores.id"),
        nullable=False,
        index=True,
    )

    product_name = Column(String(100), nullable=False)    
    quantity_kg = Column(Integer, nullable=False, default=0)
    reserved_quantity_kg = Column(Integer, nullable=False, default=0)

    price_per_kg = Column(Float, nullable=True)

    last_updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    last_verified_at = Column(DateTime(timezone=True), nullable=True)

    @property
    def available_quantity_kg(self):
        return self.quantity_kg - self.reserved_quantity_kg
