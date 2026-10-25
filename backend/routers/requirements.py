
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.farmer import Farmer
from backend.models.requirement import Requirement
from backend.models.user import User
from backend.schemas.farmer_schema import (
    RequirementCreate,
    RequirementResponse,
)


router = APIRouter(
    prefix="/requirements",
    tags=["Farmer Requirements"],
)


def get_farmer_profile(db: Session, user_id: int) -> Farmer:
    farmer = (
        db.query(Farmer)
        .filter(Farmer.user_id == user_id)
        .first()
    )

    if farmer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found.",
        )

    return farmer


# Submit a new urea requirement
@router.post(
    "/",
    response_model=RequirementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_requirement(
    requirement_data: RequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only farmers can submit urea requirements.",
        )

    farmer = get_farmer_profile(db, current_user.id)

    new_requirement = Requirement(
        farmer_id=farmer.id,
        crop_name=requirement_data.crop_name.strip(),
        crop_stage=(
            requirement_data.crop_stage.strip()
            if requirement_data.crop_stage
            else None
        ),
        cultivated_area_acres=(
            requirement_data.cultivated_area_acres
        ),
        quantity_kg=requirement_data.quantity_kg,
        required_date=requirement_data.required_date,
        village=requirement_data.village.strip(),
        district=requirement_data.district.strip(),
        state=requirement_data.state.strip(),
        notes=(
            requirement_data.notes.strip()
            if requirement_data.notes
            else None
        ),
        status="pending",
    )

    db.add(new_requirement)
    db.commit()
    db.refresh(new_requirement)

    return new_requirement


# View only the logged-in farmer's requirements
@router.get(
    "/",
    response_model=list[RequirementResponse],
)
def list_my_requirements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only farmers can view their requirements.",
        )

    farmer = get_farmer_profile(db, current_user.id)

    requirements = (
        db.query(Requirement)
        .filter(Requirement.farmer_id == farmer.id)
        .order_by(Requirement.created_at.desc())
        .all()
    )

    return requirements
