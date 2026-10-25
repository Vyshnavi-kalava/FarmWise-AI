
from dotenv import load_dotenv

# Load environment variables before importing backend routers.
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.auth import router as auth_router
from backend.routers.requirements import router as requirements_router
from backend.routers.inventory import router as inventory_router
from backend.routers.forecasting import router as forecasting_router
from backend.routers.dealers import router as dealer_router
from backend.routers.stores import router as stores_router
from backend.routers.farmers import router as farmer_router
from backend.routers.admin import router as admin_router
from backend.routers.admin_dealers import router as admin_dealers_router


from backend.dependencies import get_current_user, require_role
from backend.models.user import User


app = FastAPI(
    title="Smart Urea Management System",
    description=(
        "A system for urea demand forecasting, "
        "inventory monitoring, shortage alerts, "
        "and distribution recommendations."
    ),
    version="1.0.0",
)


# CORS configuration for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API routers
app.include_router(auth_router)
app.include_router(requirements_router)
app.include_router(inventory_router)
app.include_router(forecasting_router)
app.include_router(dealer_router)
app.include_router(stores_router)
app.include_router(farmer_router)
app.include_router(admin_router)
app.include_router(admin_dealers_router)

# Home endpoint
@app.get("/")
def home():
    return {
        "message": "Smart Urea Management System API is running",
        "status": "success",
        "version": "1.0.0",
    }


# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Protected endpoint: returns the currently logged-in user
@app.get("/auth/me", tags=["Authentication"])
def read_current_user(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
    }


# Test endpoint: only dealers can access this
@app.get("/test/dealer-only", tags=["Role-Based Access"])
def dealer_only_test(
    current_user: User = Depends(require_role("dealer")),
):
    return {
        "message": "Dealer access granted!",
        "user": current_user.full_name,
        "role": current_user.role,
    }
