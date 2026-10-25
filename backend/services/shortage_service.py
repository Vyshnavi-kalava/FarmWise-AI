
from sqlalchemy.orm import Session

from backend.models.inventory import Inventory
from backend.models.store import Store


def check_urea_shortage(
    db: Session,
    predicted_demand_kg: float,
    district: str,
    crop: str = "Paddy",
) -> dict:
    """
    Compare predicted urea demand with available stock
    in active stores in the specified district.

    Note: This is a district-level stock estimate.
    It does not reserve stock or allocate inventory.
    """

    if predicted_demand_kg < 0:
        raise ValueError("Predicted demand cannot be negative.")

    if not district or not district.strip():
        raise ValueError("District must not be empty.")

    # Get inventory from active stores in the requested district
    inventory_records = (
        db.query(Inventory)
        .join(Store, Inventory.store_id == Store.id)
        .filter(
            Store.district.ilike(district.strip()),
            Store.is_active.is_(True),
        )
        .all()
    )

    # Calculate available stock by summing total stock minus reservations
    available_stock_kg = sum(
        inventory.available_quantity_kg
        for inventory in inventory_records
        if inventory.product_name.strip().casefold() == "urea"
    )

    shortage_kg = max(
        0,
        predicted_demand_kg - available_stock_kg,
    )

    if shortage_kg > 0:
        status = "SHORTAGE"
        message = (
            f"Potential urea shortage of {shortage_kg:.0f} kg "
            f"for {crop} in {district.strip()}."
        )
    else:
        status = "SUFFICIENT"
        message = (
            f"Available urea stock covers the predicted demand "
            f"for {crop} in {district.strip()}."
        )

    return {
        "district": district.strip(),
        "crop": crop.strip(),
        "predicted_demand_kg": round(predicted_demand_kg, 2),
        "available_stock_kg": available_stock_kg,
        "shortage_kg": round(shortage_kg, 2),
        "status": status,
        "message": message,
    }
