
from backend.database import SessionLocal
from backend.services.shortage_service import check_urea_shortage


def main():
    db = SessionLocal()

    try:
        # Test 1: Demand exceeds available stock
        shortage_result = check_urea_shortage(
            db=db,
            predicted_demand_kg=20000,
            district="Krishna",
            crop="Paddy",
        )

        print("TEST 1: Demand exceeds stock")
        print(shortage_result)

        assert shortage_result["status"] == "SHORTAGE"
        assert shortage_result["shortage_kg"] > 0

        # Test 2: Available stock covers demand
        sufficient_result = check_urea_shortage(
            db=db,
            predicted_demand_kg=100,
            district="Krishna",
            crop="Paddy",
        )

        print("\nTEST 2: Stock covers demand")
        print(sufficient_result)

        assert sufficient_result["status"] == "SUFFICIENT"
        assert sufficient_result["shortage_kg"] == 0

        print("\nBoth shortage service tests passed!")

    finally:
        db.close()


if __name__ == "__main__":
    main()
