
from backend.database import SessionLocal
from backend.models.inventory import Inventory
from backend.models.store import Store
from backend.models.dealer import Dealer

def clear_business_data():
    db = SessionLocal()

    try:
        # Delete child records before their parent records.
        db.query(Inventory).delete(synchronize_session=False)
        db.query(Store).delete(synchronize_session=False)
        db.query(Dealer).delete(synchronize_session=False)

        db.commit()
        print("All inventory, stores, and dealer profiles were deleted.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    confirmation = input(
        "This will delete ALL dealer profiles, stores, and inventory. "
        "Type DELETE to continue: "
    )

    if confirmation == "DELETE":
        clear_business_data()
    else:
        print("Cancelled. No records were deleted.")
