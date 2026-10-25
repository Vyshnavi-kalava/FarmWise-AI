
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_role
from backend.models.dealer import Dealer
from backend.models.inventory import Inventory
from backend.models.store import Store
from backend.models.user import User


router = APIRouter(
    prefix="/farmer",
    tags=["Farmer"],
)


@router.get("/products")
def search_products(
    q: str = Query(default="", max_length=100),
    village: str | None = Query(default=None, max_length=100),
    district: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("farmer")),
):
    """Search active stores for products with available inventory."""

    query = (
        db.query(Inventory, Store, Dealer, User)
        .join(Store, Inventory.store_id == Store.id)
        .join(Dealer, Store.dealer_id == Dealer.id)
        .join(User, Dealer.user_id == User.id)
        .filter(
            Store.is_active.is_(True),
            Dealer.is_active.is_(True),
            User.is_active.is_(True),
            (Inventory.quantity_kg - Inventory.reserved_quantity_kg) > 0,
        )
    )

    product_query = q.strip()
    if product_query:
        query = query.filter(
            Inventory.product_name.ilike(f"%{product_query}%")
        )

    village_query = village.strip() if village else ""
    if village_query:
        query = query.filter(
            Store.village.ilike(f"%{village_query}%")
        )

    district_query = district.strip() if district else ""
    if district_query:
        query = query.filter(
            Store.district.ilike(f"%{district_query}%")
        )

    results = query.order_by(
        Inventory.product_name.asc(),
        Store.store_name.asc(),
    ).all()

    return [
        {
            "inventory_id": inventory.id,
            "product_name": inventory.product_name,
            "available_quantity_kg": inventory.available_quantity_kg,
            "price_per_kg": inventory.price_per_kg,
            "inventory_updated_at": inventory.last_updated_at,
            "inventory_verified_at": inventory.last_verified_at,
            "store": {
                "id": store.id,
                "name": store.store_name,
                "address": store.address,
                "village": store.village,
                "district": store.district,
                "state": store.state,
            },
            "dealer": {
                "full_name": user.full_name,
                "business_name": dealer.business_name,
                "phone": dealer.phone,
                "is_verified": dealer.is_verified,
            },
        }
        for inventory, store, dealer, user in results
    ]


@router.get("/stores")
def search_stores(
    village: str | None = Query(default=None, max_length=100),
    district: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("farmer")),
):
    """Find active stores matching a village or district."""

    query = (
        db.query(Store, Dealer, User)
        .join(Dealer, Store.dealer_id == Dealer.id)
        .join(User, Dealer.user_id == User.id)
        .filter(
            Store.is_active.is_(True),
            Dealer.is_active.is_(True),
            User.is_active.is_(True),
        )
    )

    village_query = village.strip() if village else ""
    if village_query:
        query = query.filter(
            Store.village.ilike(f"%{village_query}%")
        )

    district_query = district.strip() if district else ""
    if district_query:
        query = query.filter(
            Store.district.ilike(f"%{district_query}%")
        )

    results = query.order_by(Store.store_name.asc()).all()

    return [
        {
            "id": store.id,
            "store_name": store.store_name,
            "address": store.address,
            "village": store.village,
            "district": store.district,
            "state": store.state,
            "dealer_name": user.full_name,
            "dealer_business_name": dealer.business_name,
            "dealer_phone": dealer.phone,
            "dealer_verified": dealer.is_verified,
        }
        for store, dealer, user in results
    ]
