
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.user import User
from backend.models.farmer import Farmer
from backend.models.dealer import Dealer
from backend.models.store import Store
from backend.security import hash_password


def seed_farmer_profile(db: Session) -> None:
    user = (
        db.query(User)
        .filter(User.email == "farmer.test@example.com")
        .first()
    )

    if user is None:
        print("Test farmer user not found. Register it first.")
        return

    if user.role != "farmer":
        print("The test user does not have the farmer role.")
        return

    farmer = (
        db.query(Farmer)
        .filter(Farmer.user_id == user.id)
        .first()
    )

    if farmer is not None:
        print(f"Farmer profile already exists. ID: {farmer.id}")
        return

    farmer = Farmer(
        user_id=user.id,
        village="Gudlavalleru",
        district="Krishna",
        state="Andhra Pradesh",
        preferred_language="English",
    )

    db.add(farmer)
    db.commit()
    db.refresh(farmer)

    print(f"Farmer profile created. ID: {farmer.id}")


def seed_dealer_and_store(db: Session) -> None:
    email = "dealer.test@example.com"

    # Find the test dealer user or create it.
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        user = User(
            full_name="Test Dealer",
            email=email,
            hashed_password=hash_password("DealerPass123!"),
            role="dealer",
            phone="9000000001",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Test dealer user created.")
    elif user.role != "dealer":
        print("The test dealer email belongs to a non-dealer account.")
        return
    else:
        print("Test dealer user already exists.")

    # Find the dealer profile or create it.
    dealer = (
        db.query(Dealer)
        .filter(Dealer.user_id == user.id)
        .first()
    )

    if dealer is None:
        dealer = Dealer(
            user_id=user.id,
            business_name="Sample Urea Store",
            license_number="TEST-UREA-001",
            village="Gudlavalleru",
            district="Krishna",
            state="Andhra Pradesh",
            phone="9000000001",
            address="Main Road, Gudlavalleru",
            is_verified=True,
            is_active=True,
        )
        db.add(dealer)
        db.commit()
        db.refresh(dealer)
        print(f"Dealer profile created. ID: {dealer.id}")
    else:
        print(f"Dealer profile already exists. ID: {dealer.id}")

    # Find the dealer's store or create it.
    store = (
        db.query(Store)
        .filter(
            Store.dealer_id == dealer.id,
            Store.store_name == "Sample Urea Store",
        )
        .first()
    )

    if store is None:
        store = Store(
            dealer_id=dealer.id,
            store_name="Sample Urea Store",
            address="Main Road, Gudlavalleru",
            village="Gudlavalleru",
            district="Krishna",
            state="Andhra Pradesh",
            is_active=True,
        )
        db.add(store)
        db.commit()
        db.refresh(store)
        print(f"Test store created. ID: {store.id}")
    else:
        print(f"Test store already exists. ID: {store.id}")


def main() -> None:
    db = SessionLocal()

    try:
        seed_farmer_profile(db)
        seed_dealer_and_store(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
