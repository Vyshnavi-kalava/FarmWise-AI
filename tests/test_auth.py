import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.main import app
from backend.models.user import User
from backend.security import hash_password
from scripts.bootstrap_admin import bootstrap_admin


@pytest.fixture
def auth_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            yield client, testing_session
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.mark.parametrize("role", ["farmer", "dealer"])
def test_registration_preserves_selected_public_role(auth_client, role):
    client, _ = auth_client

    response = client.post(
        "/auth/register",
        json={
            "full_name": "Test User",
            "email": f"{role}@example.com",
            "password": "SafeTestPass123!",
            "role": role,
        },
    )

    assert response.status_code == 201
    assert response.json()["role"] == role


def test_public_registration_rejects_admin_role(auth_client):
    client, _ = auth_client

    response = client.post(
        "/auth/register",
        json={
            "full_name": "Test Admin",
            "email": "public-admin@example.com",
            "password": "SafeTestPass123!",
            "role": "admin",
        },
    )

    assert response.status_code == 422


def test_bootstrap_creates_new_admin_account(auth_client):
    _, testing_session = auth_client
    db = testing_session()
    try:
        user = bootstrap_admin(
            db,
            "New Admin",
            "new-admin@example.com",
            "SafeTestPass123!",
        )
        db.commit()

        assert user.email == "new-admin@example.com"
        assert user.role == "admin"
    finally:
        db.close()


def test_bootstrapped_admin_can_log_in_and_open_admin_dashboard(auth_client):
    client, testing_session = auth_client
    email = "admin@example.com"
    password = "SafeTestPass123!"

    registration = client.post(
        "/auth/register",
        json={
            "full_name": "Test Admin",
            "email": email,
            "password": password,
            "role": "farmer",
        },
    )
    assert registration.status_code == 201

    db = testing_session()
    try:
        db.add(
            User(
                full_name="Existing Admin",
                email="existing-admin@example.com",
                hashed_password=hash_password(password),
                role="admin",
                is_active=True,
            )
        )
        db.commit()

        user = bootstrap_admin(db, "Test Admin", email)
        db.commit()
        assert user.role == "admin"
    finally:
        db.close()

    login = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )

    assert login.status_code == 200
    assert login.json()["user"]["role"] == "admin"

    dashboard = client.get(
        "/admin/overview",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    assert dashboard.status_code == 200

    db = testing_session()
    try:
        with pytest.raises(ValueError, match="administrator account already exists"):
            bootstrap_admin(
                db,
                "Other Admin",
                "other-admin@example.com",
                password,
            )
    finally:
        db.close()