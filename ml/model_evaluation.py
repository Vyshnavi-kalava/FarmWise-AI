
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error

from ml.data_preprocessing import load_demand_data


def evaluate_models(
    district: str = "Krishna",
    crop: str = "Paddy",
) -> dict:
    """Compare Linear Regression with a naive demand forecast."""

    df = load_demand_data()

    # Filter records for the selected district and crop
    df = df[
        (df["district"].str.casefold() == district.strip().casefold())
        & (df["crop"].str.casefold() == crop.strip().casefold())
    ].copy()

    df = df.sort_values("date").reset_index(drop=True)

    if len(df) < 5:
        raise ValueError("At least five records are required.")

    # Use the earliest 80% for training and the latest 20% for testing
    split_index = int(len(df) * 0.8)
    train_df = df.iloc[:split_index].copy()
    test_df = df.iloc[split_index:].copy()

    if train_df.empty or test_df.empty:
        raise ValueError("Insufficient data for training and testing.")

    # Model 1: Linear Regression
    X_train = pd.DataFrame(
        {"week_number": range(len(train_df))}
    )
    X_test = pd.DataFrame(
        {"week_number": range(len(train_df), len(df))}
    )

    linear_model = LinearRegression()
    linear_model.fit(X_train, train_df["demand_kg"])

    linear_predictions = linear_model.predict(X_test).clip(min=0)

    # Model 2: Naive Forecast
    # Predict each test week using the last demand value from training.
    last_training_demand = float(train_df["demand_kg"].iloc[-1])

    naive_predictions = [
        last_training_demand
    ] * len(test_df)

    # Actual demand for the test period
    actual = test_df["demand_kg"].to_numpy()

    # Calculate evaluation metrics
    def calculate_metrics(predictions):
        return {
            "mae_kg": round(
                float(mean_absolute_error(actual, predictions)), 2
            ),
            "rmse_kg": round(
                float(mean_squared_error(actual, predictions) ** 0.5),
                2,
            ),
        }

    linear_metrics = calculate_metrics(linear_predictions)
    naive_metrics = calculate_metrics(naive_predictions)

    # Build the comparison table.
    # Each column contains exactly one value per test record.
    comparison = pd.DataFrame(
        {
            "date": test_df["date"].dt.strftime("%Y-%m-%d").to_list(),
            "actual_demand_kg": actual.tolist(),
            "linear_regression_kg": (
                linear_predictions.round().astype(int).tolist()
            ),
            "naive_forecast_kg": (
                pd.Series(naive_predictions).round().astype(int).tolist()
            ),
        }
    )

    return {
        "district": district,
        "crop": crop,
        "training_records": len(train_df),
        "testing_records": len(test_df),
        "linear_regression": linear_metrics,
        "naive_forecast": naive_metrics,
        "comparison": comparison,
    }


if __name__ == "__main__":
    results = evaluate_models()

    print("Demand Forecast Model Comparison")
    print("================================")
    print(f"District: {results['district']}")
    print(f"Crop: {results['crop']}")
    print(f"Training records: {results['training_records']}")
    print(f"Testing records: {results['testing_records']}")

    print("\nModel 1: Linear Regression")
    print(f"MAE: {results['linear_regression']['mae_kg']} kg")
    print(f"RMSE: {results['linear_regression']['rmse_kg']} kg")

    print("\nModel 2: Naive Forecast")
    print(f"MAE: {results['naive_forecast']['mae_kg']} kg")
    print(f"RMSE: {results['naive_forecast']['rmse_kg']} kg")

    print("\nActual vs Predicted Demand")
    print(results["comparison"].to_string(index=False))

    # Report which model has lower MAE on this test period
    linear_mae = results["linear_regression"]["mae_kg"]
    naive_mae = results["naive_forecast"]["mae_kg"]

    print("\nComparison Result")
    if linear_mae < naive_mae:
        print("Linear Regression has lower MAE on this test period.")
    elif naive_mae < linear_mae:
        print("Naive Forecast has lower MAE on this test period.")
    else:
        print("Both models have equal MAE on this test period.")
