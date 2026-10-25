
# from fastapi import APIRouter, Depends, HTTPException, status
# from pydantic import BaseModel, ConfigDict, Field
# from sqlalchemy.orm import Session

# from backend.database import get_db
# from backend.dependencies import require_role
# from backend.models.dealer import Dealer
# from backend.models.user import User


# router = APIRouter(
#     prefix="/dealers",
#     tags=["Dealer Profile"],
# )


# class DealerProfileCreate(BaseModel):
#     business_name: str = Field(min_length=2, max_length=150)
#     phone: str = Field(min_length=7, max_length=20)
#     village: str = Field(min_length=2, max_length=100)
#     district: str = Field(min_length=2, max_length=100)
#     state: str = Field(min_length=2, max_length=100)
#     license_number: str | None = Field(default=None, max_length=100)
#     address: str | None = Field(default=None, max_length=255)

#     model_config = ConfigDict(extra="forbid")


# class DealerProfileResponse(BaseModel):
#     id: int
#     user_id: int
#     business_name: str
#     license_number: str | None
#     village: str
#     district: str
#     state: str
#     phone: str
#     address: str | None
#     is_verified: bool
#     is_active: bool

#     model_config = ConfigDict(from_attributes=True)


# def get_my_dealer(db: Session, user_id: int) -> Dealer | None:
#     return (
#         db.query(Dealer)
#         .filter(Dealer.user_id == user_id)
#         .first()
#     )


# @router.get(
#     "/me",
#     response_model=DealerProfileResponse,
# )
# def read_my_dealer_profile(
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_role("dealer")),
# ):
#     dealer = get_my_dealer(db, current_user.id)

#     if dealer is None:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Dealer profile not found. Please create your profile.",
#         )

#     return dealer


# @router.post(
#     "/me",
#     response_model=DealerProfileResponse,
#     status_code=status.HTTP_201_CREATED,
# )
# def create_my_dealer_profile(
#     profile_data: DealerProfileCreate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_role("dealer")),
# ):
#     existing_profile = get_my_dealer(db, current_user.id)

#     if existing_profile is not None:
#         raise HTTPException(
#             status_code=status.HTTP_409_CONFLICT,
#             detail="Your dealer profile already exists.",
#         )

#     business_name = profile_data.business_name.strip()
#     phone = profile_data.phone.strip()
#     village = profile_data.village.strip()
#     district = profile_data.district.strip()
#     state = profile_data.state.strip()

#     if not all(
#         [business_name, phone, village, district, state]
#     ):
#         raise HTTPException(
#             status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
#             detail="Please fill in all required profile fields.",
#         )

#     license_number = (
#         profile_data.license_number.strip()
#         if profile_data.license_number
#         else None
#     )

#     address = (
#         profile_data.address.strip()
#         if profile_data.address
#         else None
#     )

#     if license_number:
#         existing_license = (
#             db.query(Dealer)
#             .filter(Dealer.license_number == license_number)
#             .first()
#         )

#         if existing_license is not None:
#             raise HTTPException(
#                 status_code=status.HTTP_409_CONFLICT,
#                 detail="This license number is already registered.",
#             )

#     dealer = Dealer(
#         user_id=current_user.id,
#         business_name=business_name,
#         phone=phone,
#         village=village,
#         district=district,
#         state=state,
#         license_number=license_number,
#         address=address,
#     )

#     db.add(dealer)

#     try:
#         db.commit()
#         db.refresh(dealer)
#     except Exception:
#         db.rollback()
#         raise

#     return dealer



from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import get_db
from backend.dependencies import require_role
from backend.models.dealer import Dealer
from backend.models.user import User


router = APIRouter(
    prefix="/dealers",
    tags=["Dealer Profile"],
)


class DealerProfileCreate(BaseModel):
    business_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=7, max_length=20)
    village: str = Field(min_length=2, max_length=100)
    district: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    license_number: str | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=255)

    model_config = ConfigDict(extra="forbid")

    @field_validator(
        "business_name",
        "phone",
        "village",
        "district",
        "state",
        "license_number",
        "address",
        mode="before",
    )
    @classmethod
    def strip_text_fields(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class DealerProfileResponse(BaseModel):
    id: int
    user_id: int
    business_name: str
    license_number: str | None
    village: str
    district: str
    state: str
    phone: str
    address: str | None
    is_verified: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


def get_my_dealer(db: Session, user_id: int) -> Dealer | None:
    return (
        db.query(Dealer)
        .filter(Dealer.user_id == user_id)
        .first()
    )


@router.get(
    "/me",
    response_model=DealerProfileResponse,
)
def read_my_dealer_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    dealer = get_my_dealer(db, current_user.id)

    if dealer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dealer profile not found. Please create your profile.",
        )

    return dealer


@router.post(
    "/me",
    response_model=DealerProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_dealer_profile(
    profile_data: DealerProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    if get_my_dealer(db, current_user.id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your dealer profile already exists.",
        )

    # Normalize and validate required fields.
    business_name = profile_data.business_name
    phone = profile_data.phone
    village = profile_data.village
    district = profile_data.district
    state = profile_data.state

    required_values = {
        "business_name": business_name,
        "phone": phone,
        "village": village,
        "district": district,
        "state": state,
    }

    missing = [
        name for name, value in required_values.items()
        if not value
    ]

    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide: " + ", ".join(missing),
        )

    license_number = profile_data.license_number
    address = profile_data.address

    if license_number:
        existing_license = (
            db.query(Dealer)
            .filter(Dealer.license_number == license_number)
            .first()
        )

        if existing_license is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This license number is already registered.",
            )

    dealer = Dealer(
        user_id=current_user.id,
        business_name=business_name,
        phone=phone,
        village=village,
        district=district,
        state=state,
        license_number=license_number,
        address=address,
    )

    try:
        db.add(dealer)
        db.commit()
        db.refresh(dealer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The dealer profile could not be created. "
                "The account or license number may already be registered."
            ),
        )
    except Exception:
        db.rollback()
        raise

    return dealer
