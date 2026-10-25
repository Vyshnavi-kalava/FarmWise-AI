
import pandas as pd
from sklearn.linear_model import LinearRegression

from ml.data_preprocessing import load_demand_data


DISTRICT_ALIASES = {
    "ntr": "Krishna",
    "krishna": "Krishna",
}


def _normalize_district_name(district: str) -> str:
    cleaned = (district or "").strip()
    if not cleaned:
        return cleaned

    normalized = cleaned.casefold()
    return DISTRICT_ALIASES.get(normalized, cleaned)


def forecast_demand(
    district: str = "Krishna",
    crop: str = "Paddy",
    weeks_ahead: int = 4,
) -> pd.DataFrame:
    """Forecast weekly urea demand using a simple linear trend."""

    if not 1 <= weeks_ahead <= 12:
        raise ValueError("weeks_ahead must be between 1 and 12.")

    normalized_district = _normalize_district_name(district)
    df = load_demand_data()

    # Select records for the requested district and crop
    df = df[
        (df["district"].str.casefold() == normalized_district.strip().casefold())
        & (df["crop"].str.casefold() == crop.strip().casefold())
    ].copy()

    if len(df) < 2:
        raise ValueError(
            f"At least two historical records are required for district '{normalized_district}' and crop '{crop.strip()}'."
        )

    df = df.sort_values("date").reset_index(drop=True)

    # Represent each observation as a sequential week number
    df["week_number"] = range(len(df))

    X = df[["week_number"]]
    y = df["demand_kg"]

    # Train the model on the historical data
    model = LinearRegression()
    model.fit(X, y)

    # Predict the next few weeks
    future_week_numbers = list(
        range(len(df), len(df) + weeks_ahead)
    )

    future_dates = [
        df["date"].iloc[-1] + pd.Timedelta(weeks=i)
        for i in range(1, weeks_ahead + 1)
    ]

    future_X = pd.DataFrame(
        {"week_number": future_week_numbers}
    )

    predictions = model.predict(future_X)

    # Demand cannot be negative
    predictions = predictions.clip(min=0)

    return pd.DataFrame(
        {
            "date": future_dates,
            "district": district.strip(),
            "crop": crop.strip(),
            "predicted_demand_kg": predictions.round().astype(int),
        }
    )


if __name__ == "__main__":
    forecast = forecast_demand()

    print("Weekly Urea Demand Forecast")
    print("==========================")
    print(forecast.to_string(index=False))
