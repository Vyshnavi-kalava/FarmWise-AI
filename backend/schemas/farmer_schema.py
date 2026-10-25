from datetime import date

from pydantic import BaseModel, Field, ConfigDict


class RequirementCreate(BaseModel):
    crop_name: str = Field(min_length=2, max_length=100)
    crop_stage: str | None = Field(default=None, max_length=50)
    cultivated_area_acres: float | None = Field(default=None, gt=0)

    quantity_kg: int = Field(gt=0)
    required_date: date

    village: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)

    notes: str | None = Field(default=None, max_length=500)


class RequirementResponse(BaseModel):
    id: int
    farmer_id: int
    crop_name: str
    crop_stage: str | None
    cultivated_area_acres: float | None
    quantity_kg: int
    required_date: date
    village: str
    district: str
    state: str
    status: str
    notes: str | None

    model_config = ConfigDict(from_attributes=True)
