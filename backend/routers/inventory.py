from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_role
from backend.models.dealer import Dealer
from backend.models.inventory import Inventory
from backend.models.store import Store
from backend.models.user import User
from datetime import datetime, timezone

from backend.schemas.inventory_schema import (
    InventoryCreate,
    InventoryResponse,
)


router = APIRouter(
    prefix="/inventory",
    tags=["Dealer Inventory"],
)


class InventoryUpdate(BaseModel):
    quantity_kg: int = Field(ge=0)
    reserved_quantity_kg: int = Field(ge=0)
    price_per_kg: float | None = Field(default=None, ge=0)

    model_config = ConfigDict(extra="forbid")


def get_dealer_profile(db: Session, user_id: int) -> Dealer:
    dealer = (
        db.query(Dealer)
        .filter(Dealer.user_id == user_id)
        .first()
    )

    if dealer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dealer profile not found.",
        )

    return dealer


def get_owned_inventory(
    db: Session,
    inventory_id: int,
    dealer_id: int,
) -> Inventory:
    inventory = (
        db.query(Inventory)
        .join(Store, Inventory.store_id == Store.id)
        .filter(
            Inventory.id == inventory_id,
            Store.dealer_id == dealer_id,
        )
        .first()
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found for this dealer.",
        )

    return inventory


# --------------------------------------------------
# CREATE INVENTORY - DEALER ONLY
# --------------------------------------------------
@router.post(
    "/",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory(
    inventory_data: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    dealer = get_dealer_profile(db, current_user.id)

    store = (
        db.query(Store)
        .filter(
            Store.id == inventory_data.store_id,
            Store.dealer_id == dealer.id,
            Store.is_active.is_(True),
        )
        .first()
    )

    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active store not found for this dealer.",
        )

    if (
        inventory_data.reserved_quantity_kg
        > inventory_data.quantity_kg
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reserved quantity cannot exceed total quantity.",
        )

    product_name = inventory_data.product_name.strip()

    if not product_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Product name cannot be empty.",
        )

    existing_inventory = (
        db.query(Inventory)
        .filter(
            Inventory.store_id == store.id,
            Inventory.product_name.ilike(product_name),
        )
        .first()
    )

    if existing_inventory is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Inventory for '{product_name}' already exists "
                "in this store. Use the update endpoint instead."
            ),
        )

    inventory = Inventory(
        store_id=store.id,
        product_name=product_name,
        quantity_kg=inventory_data.quantity_kg,
        reserved_quantity_kg=inventory_data.reserved_quantity_kg,
        price_per_kg=inventory_data.price_per_kg,
    )

    db.add(inventory)

    try:
        db.commit()
        db.refresh(inventory)
    except Exception:
        db.rollback()
        raise

    return inventory


# --------------------------------------------------
# LIST INVENTORY - LOGGED-IN DEALER ONLY
# --------------------------------------------------
@router.get(
    "/",
    response_model=list[InventoryResponse],
)
def list_my_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    dealer = get_dealer_profile(db, current_user.id)

    return (
        db.query(Inventory)
        .join(Store, Inventory.store_id == Store.id)
        .filter(Store.dealer_id == dealer.id)
        .order_by(Inventory.id.desc())
        .all()
    )


# --------------------------------------------------
# UPDATE INVENTORY - DEALER ONLY
# --------------------------------------------------
@router.put(
    "/{inventory_id}",
    response_model=InventoryResponse,
)
def update_inventory(
    inventory_id: int,
    inventory_data: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    dealer = get_dealer_profile(db, current_user.id)

    inventory = get_owned_inventory(
        db,
        inventory_id,
        dealer.id,
    )

    if (
        inventory_data.reserved_quantity_kg
        > inventory_data.quantity_kg
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reserved quantity cannot exceed total quantity.",
        )

    inventory.quantity_kg = inventory_data.quantity_kg
    inventory.reserved_quantity_kg = (
    inventory_data.reserved_quantity_kg
    )
    inventory.price_per_kg = inventory_data.price_per_kg

    inventory.last_updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
        db.refresh(inventory)
    except Exception:
        db.rollback()
        raise

    return inventory


# --------------------------------------------------
# ADMIN INVENTORY SUMMARY - ALL STORES
# --------------------------------------------------
@router.get(
    "/admin-summary",
    tags=["Admin Inventory"],
)
def get_admin_inventory_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    records = (
        db.query(Inventory, Store)
        .join(Store, Inventory.store_id == Store.id)
        .order_by(Inventory.last_updated_at.desc())
        .all()
    )

    inventory_items = []

    for item, store in records:
        inventory_items.append({
            "id": item.id,
            "product_name": item.product_name,
            "store_name": store.store_name,
            "district": store.district,
            "quantity_kg": item.quantity_kg,
            "available_quantity_kg": (
                item.quantity_kg - item.reserved_quantity_kg
            ),
            "reserved_quantity_kg": item.reserved_quantity_kg,
            "price_per_kg": item.price_per_kg,
            "last_updated_at": (
                item.last_updated_at.isoformat()
                if item.last_updated_at else None
            ),
        })

    return inventory_items
