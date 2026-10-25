import re
from getpass import getpass

from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.user import User
from backend.security import hash_password
from scripts.init_db import initialize_database


def bootstrap_admin(
    db: Session,
    full_name: str,
    email: str,
    password: str | None = None,
) -> User:
    normalized_email = email.strip().lower()

    if (
        len(normalized_email) < 5
        or len(normalized_email) > 150
        or not re.fullmatch(
            r"[^\s@]+@[^\s@]+\.[^\s@]+",
            normalized_email,
        )
    ):
        raise ValueError("Please provide a valid email address.")

    user = db.query(User).filter(User.email == normalized_email).first()

    if user is not None:
        if not user.is_active:
            raise ValueError("The existing account is inactive.")

        user.role = "admin"
        return user

    if db.query(User).filter(User.role == "admin").first():
        raise ValueError(
            "An administrator account already exists. "
            "Provide the email of the account you want to promote."
        )

    normalized_name = full_name.strip()
    if len(normalized_name) < 2 or len(normalized_name) > 100:
        raise ValueError(
            "Please provide a full name between 2 and 100 characters."
        )
    if not password or len(password) < 8 or len(password) > 128:
        raise ValueError("A password between 8 and 128 characters is required.")

    user = User(
        full_name=normalized_name,
        email=normalized_email,
        hashed_password=hash_password(password),
        role="admin",
        is_active=True,
    )
    db.add(user)
    return user


def main() -> None:
    initialize_database()
    db = SessionLocal()

    try:
        email = input("Admin email: ").strip().lower()
        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user is not None:
            confirmation = input(
                f"Promote existing {existing_user.role} account "
                f"{existing_user.email} to admin? [y/N]: "
            )
            if confirmation.strip().lower() != "y":
                print("Admin setup cancelled.")
                return
            user = bootstrap_admin(db, existing_user.full_name, email)
        else:
            full_name = input("Admin full name: ").strip()
            password = getpass("Admin password (8+ characters): ")
            confirmation = getpass("Confirm admin password: ")
            if password != confirmation:
                raise ValueError("The passwords do not match.")
            user = bootstrap_admin(db, full_name, email, password)

        db.commit()
        print(
            f"Admin account ready for {user.email}. "
            "Sign in using the Admin role."
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
