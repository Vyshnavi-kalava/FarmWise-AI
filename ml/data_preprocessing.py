
from pathlib import Path

import pandas as pd


# Locate the project's sample demand dataset
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "sample_demand.csv"


def load_demand_data() -> pd.DataFrame:
    """Load and validate the historical urea demand dataset."""
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Demand dataset not found: {DATA_FILE}"
        )

    df = pd.read_csv(DATA_FILE)

    required_columns = {
        "date",
        "district",
        "crop",
        "season",
        "demand_kg",
    }

    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        raise ValueError(
            f"Missing required columns: {sorted(missing_columns)}"
        )

    # Convert dates and demand values to appropriate types
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["demand_kg"] = pd.to_numeric(
        df["demand_kg"], errors="coerce"
    )

    # Remove rows with missing or invalid values
    df = df.dropna(subset=list(required_columns)).copy()

    # Demand cannot be negative
    df = df[df["demand_kg"] >= 0].copy()

    # Clean text columns
    for column in ["district", "crop", "season"]:
        df[column] = df[column].astype(str).str.strip()

    # Remove empty text values
    for column in ["district", "crop", "season"]:
        df = df[df[column] != ""]

    # Sort records chronologically
    df = df.sort_values("date").reset_index(drop=True)

    if df.empty:
        raise ValueError("No valid demand records are available.")

    return df


if __name__ == "__main__":
    demand_df = load_demand_data()

    print("Demand dataset loaded successfully!")
    print(f"Total valid records: {len(demand_df)}")
    print("\nFirst five records:")
    print(demand_df.head().to_string(index=False))

    print("\nDataset information:")
    print(demand_df.dtypes)

    print("\nDemand summary:")
    print(demand_df["demand_kg"].describe())
