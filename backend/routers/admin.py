
# from fastapi import APIRouter, Depends
# from sqlalchemy import func
# from sqlalchemy.orm import Session

# from backend.database import get_db
# from backend.dependencies import require_role
# from backend.models.user import User
# from backend.models.farmer import Farmer
# from backend.models.dealer import Dealer
# from backend.models.store import Store
# from backend.models.inventory import Inventory

# router = APIRouter(
#     prefix="/admin",
#     tags=["Admin"],
#     dependencies=[Depends(require_role("admin"))],
# )


# @router.get("/overview")
# def get_admin_overview(db: Session = Depends(get_db)):
#     """Return dashboard metrics calculated from database records."""

#     farmer_count = (
#     db.query(func.count(User.id))
#     .filter(User.role == "farmer")
#     .scalar()
#     or 0
# )

#     dealer_count = (
#         db.query(func.count(Dealer.id)).scalar() or 0
#     )

#     pending_dealer_count = (
#         db.query(func.count(Dealer.id))
#         .filter(
#             Dealer.is_verified.is_(False),
#             Dealer.is_active.is_(True),
#         )
#         .scalar()
#         or 0
#     )

#     active_user_count = (
#         db.query(func.count(User.id))
#         .filter(User.is_active.is_(True))
#         .scalar()
#         or 0
#     )

#     active_store_count = (
#         db.query(func.count(Store.id))
#         .join(Dealer, Store.dealer_id == Dealer.id)
#         .join(User, Dealer.user_id == User.id)
#         .filter(
#             Store.is_active.is_(True),
#             Dealer.is_active.is_(True),
#             User.is_active.is_(True),
#         )
#         .scalar()
#         or 0
#     )

#     inventory_totals = (
#         db.query(
#             func.count(Inventory.id),
#             func.coalesce(func.sum(Inventory.quantity_kg), 0),
#             func.coalesce(
#                 func.sum(Inventory.reserved_quantity_kg), 0
#             ),
#         )
#         .join(Store, Inventory.store_id == Store.id)
#         .join(Dealer, Store.dealer_id == Dealer.id)
#         .join(User, Dealer.user_id == User.id)
#         .filter(
#             Store.is_active.is_(True),
#             Dealer.is_active.is_(True),
#             Dealer.is_verified.is_(True),
#             Dealer.is_active.is_(True),
#             User.is_active.is_(True),
#         )
#         .one()
#     )

#     inventory_count, total_quantity, reserved_quantity = inventory_totals

#     product_rows = (
#         db.query(
#             Inventory.product_name,
#             func.coalesce(
#                 func.sum(
#                     Inventory.quantity_kg
#                     - Inventory.reserved_quantity_kg
#                 ),
#                 0,
#             ).label("available_quantity_kg"),
#             func.count(Inventory.id).label("record_count"),
#         )
#         .join(Store, Inventory.store_id == Store.id)
#         .join(Dealer, Store.dealer_id == Dealer.id)
#         .join(User, Dealer.user_id == User.id)
#         .filter(
#             Store.is_active.is_(True),
#             Dealer.is_active.is_(True),
#             Dealer.is_verified.is_(True),
#             User.is_active.is_(True),
#         )
#         .group_by(Inventory.product_name)
#         .order_by(Inventory.product_name.asc())
#         .all()
#     )

#     stock_rows = (
#         db.query(
#             Inventory.id,
#             Inventory.product_name,
#             Inventory.quantity_kg,
#             Inventory.reserved_quantity_kg,
#             Inventory.price_per_kg,
#             Inventory.last_updated_at,
#             Store.store_name,
#             Store.village,
#             Store.district,
#             Store.state,
#         )
#         .join(Store, Inventory.store_id == Store.id)
#         .join(Dealer, Store.dealer_id == Dealer.id)
#         .join(User, Dealer.user_id == User.id)
#         .filter(
#             Store.is_active.is_(True),
#             Dealer.is_active.is_(True),
#             Dealer.is_verified.is_(True),
#             User.is_active.is_(True),
#         )
#         .order_by(
#             Store.district.asc(),
#             Store.store_name.asc(),
#             Inventory.product_name.asc(),
#         )
#         .limit(100)
#         .all()
#     )

#     return {
#         "metrics": {
#             "registered_farmers": farmer_count,
#             "registered_dealers": dealer_count,
#             "pending_dealer_verification": pending_dealer_count,
#             "active_users": active_user_count,
#             "active_stores": active_store_count,
#             "inventory_records": inventory_count,
#             "total_stock_kg": int(total_quantity),
#             "reserved_stock_kg": int(reserved_quantity),
#             "available_stock_kg": int(total_quantity - reserved_quantity),
#         },
#         "products": [
#             {
#                 "product_name": row.product_name,
#                 "available_quantity_kg": int(row.available_quantity_kg),
#                 "record_count": row.record_count,
#             }
#             for row in product_rows
#         ],
#         "inventory": [
#             {
#                 "id": row.id,
#                 "product_name": row.product_name,
#                 "quantity_kg": row.quantity_kg,
#                 "reserved_quantity_kg": row.reserved_quantity_kg,
#                 "available_quantity_kg": (
#                     row.quantity_kg - row.reserved_quantity_kg
#                 ),
#                 "price_per_kg": row.price_per_kg,
#                 "last_updated_at": row.last_updated_at,
#                 "store_name": row.store_name,
#                 "village": row.village,
#                 "district": row.district,
#                 "state": row.state,
#             }
#             for row in stock_rows
#         ],
#     }

# # @router.get("/farmers")
# # def get_admin_farmers(db: Session = Depends(get_db)):
# #     """Return farmer profile and account details for the admin dashboard."""

# #     results = (
# #         db.query(Farmer, User)
# #         .join(User, Farmer.user_id == User.id)
# #         .filter(User.role == "farmer")
# #         .order_by(User.full_name.asc())
# #         .all()
# #     )

# #     return [
# #         {
# #             "id": farmer.id,
# #             "full_name": user.full_name,
# #             "email": user.email,
# #             "phone": user.phone,
# #             "village": farmer.village,
# #             "district": farmer.district,
# #             "state": farmer.state,
# #             "preferred_language": farmer.preferred_language,
# #             "registration_date": user.created_at,
# #             "is_active": user.is_active,
# #         }
# #         for farmer, user in results
# #     ]



# @router.get("/farmers")
# def get_admin_farmers(db: Session = Depends(get_db)):
#     """Return all farmer accounts, including those without profiles."""

#     results = (
#         db.query(User, Farmer)
#         .outerjoin(Farmer, Farmer.user_id == User.id)
#         .filter(User.role == "farmer")
#         .order_by(User.full_name.asc())
#         .all()
#     )

#     return [
#         {
#             "id": user.id,
#             "farmer_profile_id": farmer.id if farmer else None,
#             "full_name": user.full_name,
#             "email": user.email,
#             "phone": user.phone,
#             "village": farmer.village if farmer else None,
#             "district": farmer.district if farmer else None,
#             "state": farmer.state if farmer else None,
#             "preferred_language": (
#                 farmer.preferred_language if farmer else None
#             ),
#             "registration_date": user.created_at,
#             "is_active": user.is_active,
#             "profile_completed": farmer is not None,
#         }
#         for user, farmer in results
#     ]



from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_role
from backend.models.user import User
from backend.models.farmer import Farmer
from backend.models.dealer import Dealer
from backend.models.store import Store
from backend.models.inventory import Inventory

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get("/overview")
def get_admin_overview(db: Session = Depends(get_db)):
    """Return dashboard metrics calculated from database records."""

    # Count all farmer accounts, including accounts without profiles.
    farmer_count = (
        db.query(func.count(User.id))
        .filter(User.role == "farmer")
        .scalar()
        or 0
    )

    # Count all dealer accounts, including accounts without profiles.
    dealer_count = (
        db.query(func.count(User.id))
        .filter(User.role == "dealer")
        .scalar()
        or 0
    )

    # Include active dealer accounts without profiles in the
    # pending verification count.
    pending_dealer_count = (
        db.query(func.count(User.id))
        .outerjoin(Dealer, Dealer.user_id == User.id)
        .filter(
            User.role == "dealer",
            User.is_active.is_(True),
            or_(
                Dealer.id.is_(None),
                Dealer.is_verified.is_(False),
            ),
        )
        .scalar()
        or 0
    )

    active_user_count = (
        db.query(func.count(User.id))
        .filter(User.is_active.is_(True))
        .scalar()
        or 0
    )

    # Count stores only when the store, dealer and account are active.
    active_store_count = (
        db.query(func.count(Store.id))
        .join(Dealer, Store.dealer_id == Dealer.id)
        .join(User, Dealer.user_id == User.id)
        .filter(
            Store.is_active.is_(True),
            Dealer.is_active.is_(True),
            User.is_active.is_(True),
        )
        .scalar()
        or 0
    )

    inventory_totals = (
        db.query(
            func.count(Inventory.id),
            func.coalesce(func.sum(Inventory.quantity_kg), 0),
            func.coalesce(
                func.sum(Inventory.reserved_quantity_kg), 0
            ),
        )
        .join(Store, Inventory.store_id == Store.id)
        .join(Dealer, Store.dealer_id == Dealer.id)
        .join(User, Dealer.user_id == User.id)
        .filter(
            Store.is_active.is_(True),
            Dealer.is_active.is_(True),
            Dealer.is_verified.is_(True),
            User.is_active.is_(True),
        )
        .one()
    )

    inventory_count, total_quantity, reserved_quantity = inventory_totals

    product_rows = (
        db.query(
            Inventory.product_name,
            func.coalesce(
                func.sum(
                    Inventory.quantity_kg
                    - Inventory.reserved_quantity_kg
                ),
                0,
            ).label("available_quantity_kg"),
            func.count(Inventory.id).label("record_count"),
        )
        .join(Store, Inventory.store_id == Store.id)
        .join(Dealer, Store.dealer_id == Dealer.id)
        .join(User, Dealer.user_id == User.id)
        .filter(
            Store.is_active.is_(True),
            Dealer.is_active.is_(True),
            Dealer.is_verified.is_(True),
            User.is_active.is_(True),
        )
        .group_by(Inventory.product_name)
        .order_by(Inventory.product_name.asc())
        .all()
    )

    stock_rows = (
        db.query(
            Inventory.id,
            Inventory.product_name,
            Inventory.quantity_kg,
            Inventory.reserved_quantity_kg,
            Inventory.price_per_kg,
            Inventory.last_updated_at,
            Store.store_name,
            Store.village,
            Store.district,
            Store.state,
        )
        .join(Store, Inventory.store_id == Store.id)
        .join(Dealer, Store.dealer_id == Dealer.id)
        .join(User, Dealer.user_id == User.id)
        .filter(
            Store.is_active.is_(True),
            Dealer.is_active.is_(True),
            Dealer.is_verified.is_(True),
            User.is_active.is_(True),
        )
        .order_by(
            Store.district.asc(),
            Store.store_name.asc(),
            Inventory.product_name.asc(),
        )
        .limit(100)
        .all()
    )

    return {
        "metrics": {
            "registered_farmers": farmer_count,
            "registered_dealers": dealer_count,
            "pending_dealer_verification": pending_dealer_count,
            "active_users": active_user_count,
            "active_stores": active_store_count,
            "inventory_records": inventory_count,
            "total_stock_kg": int(total_quantity),
            "reserved_stock_kg": int(reserved_quantity),
            "available_stock_kg": int(
                total_quantity - reserved_quantity
            ),
        },
        "products": [
            {
                "product_name": row.product_name,
                "available_quantity_kg": int(
                    row.available_quantity_kg
                ),
                "record_count": row.record_count,
            }
            for row in product_rows
        ],
        "inventory": [
            {
                "id": row.id,
                "product_name": row.product_name,
                "quantity_kg": row.quantity_kg,
                "reserved_quantity_kg": row.reserved_quantity_kg,
                "available_quantity_kg": (
                    row.quantity_kg - row.reserved_quantity_kg
                ),
                "price_per_kg": row.price_per_kg,
                "last_updated_at": row.last_updated_at,
                "store_name": row.store_name,
                "village": row.village,
                "district": row.district,
                "state": row.state,
            }
            for row in stock_rows
        ],
    }


@router.get("/farmers")
def get_admin_farmers(db: Session = Depends(get_db)):
    """Return all farmer accounts, including those without profiles."""

    results = (
        db.query(User, Farmer)
        .outerjoin(Farmer, Farmer.user_id == User.id)
        .filter(User.role == "farmer")
        .order_by(User.full_name.asc())
        .all()
    )

    return [
        {
            "id": user.id,
            "farmer_profile_id": farmer.id if farmer else None,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "village": farmer.village if farmer else None,
            "district": farmer.district if farmer else None,
            "state": farmer.state if farmer else None,
            "preferred_language": (
                farmer.preferred_language if farmer else None
            ),
            "registration_date": user.created_at,
            "is_active": user.is_active,
            "profile_completed": farmer is not None,
        }
        for user, farmer in results
    ]


@router.get("/dealers")
def get_admin_dealers(db: Session = Depends(get_db)):
    """
    Return all dealer accounts, including accounts without dealer
    profiles or registered stores.
    """

    results = (
        db.query(User, Dealer)
        .outerjoin(Dealer, Dealer.user_id == User.id)
        .filter(User.role == "dealer")
        .order_by(User.full_name.asc())
        .all()
    )

    return [
        {
            "id": user.id,
            "dealer_profile_id": dealer.id if dealer else None,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "business_name": (
                dealer.business_name if dealer else None
            ),
            "village": dealer.village if dealer else None,
            "district": dealer.district if dealer else None,
            "state": dealer.state if dealer else None,
            "address": dealer.address if dealer else None,
            "license_number": (
                dealer.license_number if dealer else None
            ),
            "registration_date": user.created_at,
            "is_active": user.is_active,
            "is_verified": (
                dealer.is_verified if dealer else False
            ),
            "dealer_is_active": (
                dealer.is_active if dealer else None
            ),
            "profile_completed": dealer is not None,
        }
        for user, dealer in results
    ]
