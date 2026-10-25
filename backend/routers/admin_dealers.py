
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_role
from backend.models.dealer import Dealer
from backend.models.user import User

router = APIRouter(
    prefix="/admin",
    tags=["Admin Dealers"],
)


@router.get("/dealers")
def get_all_dealers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    records = (
        db.query(Dealer, User)
        .join(User, Dealer.user_id == User.id)
        .order_by(Dealer.created_at.desc())
        .all()
    )

    dealers = []

    for dealer, user in records:
        dealers.append({
            "id": dealer.id,
            "user_id": user.id,
            "business_name": dealer.business_name,
            "dealer_name": user.full_name,
            "email": user.email,
            "phone": dealer.phone,
            "license_number": dealer.license_number,
            "village": dealer.village,
            "district": dealer.district,
            "state": dealer.state,
            "address": dealer.address,
            "is_verified": dealer.is_verified,
            "is_active": dealer.is_active,
            "user_is_active": user.is_active,
            "created_at": (
                dealer.created_at.isoformat()
                if dealer.created_at else None
            ),
        })

    return {
        "dealers": dealers,
        "total": len(dealers),
        "active_count": sum(
            1 for d in dealers
            if d["is_active"] and d["user_is_active"]
        ),
        "verified_count": sum(
            1 for d in dealers if d["is_verified"]
        ),
        "pending_count": sum(
            1 for d in dealers if not d["is_verified"]
        ),
    }
