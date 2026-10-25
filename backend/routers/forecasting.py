
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_role
from backend.models.user import User
from backend.services.shortage_service import check_urea_shortage
from ml.demand_forecasting import forecast_demand


router = APIRouter(
    prefix="/forecasting",
    tags=["Demand Forecasting and Shortage Alerts"],
)


# 1. Demand forecasting endpoint
@router.get("/demand")
def get_demand_forecast(
    district: str = Query(min_length=2, max_length=100),
    crop: str = Query(default="Paddy", min_length=2, max_length=100),
    weeks_ahead: int = Query(default=4, ge=1, le=12),
    current_user: User = Depends(require_role("dealer")),
):
    """Forecast weekly demand for a district and crop."""

    try:
        forecast = forecast_demand(
            district=district,
            crop=crop,
            weeks_ahead=weeks_ahead,
        )

    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return {
        "district": district.strip(),
        "crop": crop.strip(),
        "weeks_ahead": weeks_ahead,
        "forecast": forecast.to_dict(orient="records"),
        "note": (
            "Demonstration forecast based on synthetic sample data. "
            "Not a verified real-world demand prediction."
        ),
    }


# 2. Shortage alert using a supplied demand estimate
@router.get("/shortage-alert")
def get_shortage_alert(
    district: str = Query(min_length=2, max_length=100),
    predicted_demand_kg: float = Query(gt=0),
    crop: str = Query(default="Paddy", min_length=2, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    """Compare a supplied demand estimate with district inventory."""

    try:
        result = check_urea_shortage(
            db=db,
            predicted_demand_kg=predicted_demand_kg,
            district=district,
            crop=crop,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return result


# 3. Combined demand forecast and shortage assessment
@router.get("/forecast-and-shortage")
def get_forecast_and_shortage(
    district: str = Query(min_length=2, max_length=100),
    crop: str = Query(default="Paddy", min_length=2, max_length=100),
    weeks_ahead: int = Query(default=4, ge=1, le=12),
    demand_period: str = Query(
        default="next_week",
        pattern="^(next_week|total)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("dealer")),
):
    """
    Forecast demand and assess potential shortage.

    next_week: compare stock against the first week's prediction.
    total: compare stock against the sum of all forecast weeks.
    """

    try:
        forecast = forecast_demand(
            district=district,
            crop=crop,
            weeks_ahead=weeks_ahead,
        )

        if forecast.empty:
            raise HTTPException(
                status_code=422,
                detail="No forecast data is available for these inputs.",
            )

        if demand_period == "next_week":
            predicted_demand_kg = float(
                forecast.iloc[0]["predicted_demand_kg"]
            )
        else:
            predicted_demand_kg = float(
                forecast["predicted_demand_kg"].sum()
            )

        shortage_result = check_urea_shortage(
            db=db,
            predicted_demand_kg=predicted_demand_kg,
            district=district,
            crop=crop,
        )

    except HTTPException:
        raise

    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return {
        "district": district.strip(),
        "crop": crop.strip(),
        "weeks_ahead": weeks_ahead,
        "demand_period": demand_period,
        "forecast": forecast.to_dict(orient="records"),
        "shortage_assessment": shortage_result,
        "note": (
            "Demonstration forecast based on synthetic sample data. "
            "Inventory reflects the records currently stored in the "
            "database and may not represent actual district-wide stock."
        ),
    }
