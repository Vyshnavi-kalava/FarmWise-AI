
from pydantic import BaseModel, Field, ConfigDict


from pydantic import BaseModel, Field, ConfigDict


class InventoryCreate(BaseModel):
    store_id: int = Field(gt=0)

    product_name: str = Field(
        min_length=2,
        max_length=100,
    )

    quantity_kg: int = Field(ge=0)
    reserved_quantity_kg: int = Field(default=0, ge=0)
    price_per_kg: float | None = Field(default=None, ge=0)

    model_config = ConfigDict(extra="forbid")


class InventoryResponse(BaseModel):
    id: int
    store_id: int
    product_name: str
    quantity_kg: int
    reserved_quantity_kg: int
    available_quantity_kg: int
    price_per_kg: float | None

    model_config = ConfigDict(from_attributes=True)


