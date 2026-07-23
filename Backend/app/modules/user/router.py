import math
from typing import Optional

from fastapi import APIRouter, Query, status

from app.core.database import get_db_connection

from .schema import UserCreate, UserResponse, UserUpdate
from .service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new user")
def create_user(payload: UserCreate, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = UserService(db)
        user = service.create_user(payload, created_by=created_by)
        return UserResponse.model_validate(user).model_dump(mode="json")
    finally:
        db.close()


@router.get("", summary="List users")
def list_users(
    name: Optional[str] = None,
    email: Optional[str] = None,
    role: Optional[str] = None,
    status_: Optional[str] = Query(None, alias="status"),
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = UserService(db)
        rows, total = service.list_users(
            name=name,
            email=email,
            role=role,
            status=status_,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )
        data = [UserResponse.model_validate(r).model_dump(mode="json") for r in rows]
        return {
            "data": data,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": math.ceil(total / page_size) if total else 0,
            },
        }
    finally:
        db.close()


@router.get("/{user_id}", summary="Get a single user")
def get_user(user_id: int):
    db = get_db_connection()
    try:
        service = UserService(db)
        user = service.get_user(user_id)
        return UserResponse.model_validate(user).model_dump(mode="json")
    finally:
        db.close()


@router.patch("/{user_id}", summary="Partially update a user")
def update_user(user_id: int, payload: UserUpdate, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = UserService(db)
        user = service.update_user(user_id, payload, updated_by=updated_by)
        return UserResponse.model_validate(user).model_dump(mode="json")
    finally:
        db.close()


@router.delete("/{user_id}", summary="Soft delete a user")
def delete_user(user_id: int, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = UserService(db)
        user = service.delete_user(user_id, updated_by=updated_by)
        return {
            "message": "User deleted successfully.",
            "deleted_record": UserResponse.model_validate(user).model_dump(mode="json"),
        }
    finally:
        db.close()
