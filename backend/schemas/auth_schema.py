
import re
from typing import Literal

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
)


EMAIL_PATTERN = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"


class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["farmer", "dealer"] = "farmer"
    phone: str | None = Field(default=None, max_length=20)

    # Farmer and dealer location
    village: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)

    # Farmer profile
    preferred_language: str | None = Field(
        default=None, max_length=20
    )

    # Dealer profile
    business_name: str | None = Field(
        default=None, max_length=150
    )
    license_number: str | None = Field(
        default=None, max_length=100
    )
    dealer_address: str | None = Field(
        default=None, max_length=255
    )

    # Optional store details for future use
    store_name: str | None = Field(
        default=None, max_length=150
    )
    store_address: str | None = Field(
        default=None, max_length=255
    )

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Please enter your full name.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(EMAIL_PATTERN, value):
            raise ValueError("Please enter a valid email address.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError(
                "Your password must contain at least 8 characters."
            )
        return value

    @field_validator(
        "phone",
        "village",
        "district",
        "state",
        "preferred_language",
        "business_name",
        "license_number",
        "dealer_address",
        "store_name",
        "store_address",
        mode="before",
    )
    @classmethod
    def normalize_optional_fields(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @model_validator(mode="after")
    def validate_role_details(self):
        if self.role == "farmer":
            required_fields = {
                "village": self.village,
                "district": self.district,
                "state": self.state,
                "preferred_language": self.preferred_language,
            }
        else:
            required_fields = {
                "phone": self.phone,
                "business_name": self.business_name,
                "village": self.village,
                "district": self.district,
                "state": self.state,
            }

        missing = [
            field
            for field, value in required_fields.items()
            if not value
        ]

        if missing:
            raise ValueError(
                "Please provide the following details: "
                + ", ".join(missing)
            )

        return self


class UserLogin(BaseModel):
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(EMAIL_PATTERN, value):
            raise ValueError("Please enter a valid email address.")
        return value


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    phone: str | None
    is_active: bool

    model_config = {"from_attributes": True}
