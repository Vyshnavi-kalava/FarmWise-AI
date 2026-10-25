
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_role
from backend.models.dealer import Dealer
from backend.models.store import Store
from backend.models.user import User


router = APIRouter(
    prefix="/stores",
    tags=["Dealer Stores"],
)


class StoreCreate(BaseModel):
    store_name: str = Field(min_length=2, max_length=150)
    address: str = Field(min_length=3, max_length=255)
    village: str = Field(min_length=2, max_length=100)
    district: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)

    model_config = ConfigDict(extra="forbid")


class StoreResponse(BaseModel):
    id: int
    dealer_id: int
    store_name: str
    address: str
    village: str
    district: str
    state: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


def get_current_dealer(db: Session, user_id: int) -> Dealer:
    dealer = (
        db.query(Dealer)
        .filter(Dealer.user_id == user_id)
        .first()
    )

    if dealer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dealer profile not found. Create your profile first.",
        )

    if not dealer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your dealer account is inactive.",
        )

    return dealer


@router.post(
    "/",
    response_model=StoreResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_store(
    store_data: StoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    dealer = get_current_dealer(db, current_user.id)

    store = Store(
        dealer_id=dealer.id,
        store_name=store_data.store_name.strip(),
        address=store_data.address.strip(),
        village=store_data.village.strip(),
        district=store_data.district.strip(),
        state=store_data.state.strip(),
    )

    db.add(store)

    try:
        db.commit()
        db.refresh(store)
    except Exception:
        db.rollback()
        raise

    return store


@router.get(
    "/",
    response_model=list[StoreResponse],
)
def list_my_stores(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    dealer = get_current_dealer(db, current_user.id)

    return (
        db.query(Store)
        .filter(Store.dealer_id == dealer.id)
        .order_by(Store.id.desc())
        .all()
    )
