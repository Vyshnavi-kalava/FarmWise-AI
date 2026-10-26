
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import get_db
from backend.models.user import User
from backend.models.farmer import Farmer
from backend.models.dealer import Dealer
from backend.schemas.auth_schema import (
    UserLogin,
    UserRegister,
    UserResponse,
)
from backend.security import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    email = user_data.email.strip().lower()
    role = user_data.role

    # Check whether the email is already registered
    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An account with this email already exists. "
                "Please sign in instead."
            ),
        )

    # Validate profile details before creating database records
    village = (user_data.village or "").strip()
    district = (user_data.district or "").strip()
    state = (user_data.state or "").strip()

    if role in ("farmer", "dealer"):
        if not village or not district or not state:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Village, district, and state are required "
                    "for registration."
                ),
            )

    if role == "farmer" and not user_data.preferred_language:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please select your preferred language.",
        )

    if role == "dealer":
        business_name = (user_data.business_name or "").strip()

        if not business_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Business name is required for dealer registration.",
            )

    # Create the main user account
    user = User(
        full_name=user_data.full_name.strip(),
        email=email,
        hashed_password=hash_password(user_data.password),
        role=role,
        phone=user_data.phone.strip() if user_data.phone else None,
    )

    try:
        db.add(user)
        db.flush()  # Assign user.id before creating the profile.

        # Create farmer profile
        if role == "farmer":
            farmer = Farmer(
                user_id=user.id,
                village=village,
                district=district,
                state=state,
                preferred_language=user_data.preferred_language,
            )
            db.add(farmer)

        # Create dealer profile
        elif role == "dealer":
            dealer = Dealer(
                user_id=user.id,
                business_name=business_name,
                village=village,
                district=district,
                state=state,
                phone=(
                    user_data.phone.strip()
                    if user_data.phone and user_data.phone.strip()
                    else "Not provided"
                ),
                license_number=user_data.license_number,
                address=(
                    user_data.dealer_address.strip()
                    if user_data.dealer_address
                    and user_data.dealer_address.strip()
                    else None
                ),
            )
            db.add(dealer)

        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Registration could not be completed. "
                "Please check the details or try another email."
            ),
        )

    except Exception:
        db.rollback()
        raise

    return user


@router.post("/login")
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    email = login_data.email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(
        login_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    access_token = create_access_token(str(user.id))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }
