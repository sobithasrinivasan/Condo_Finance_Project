from typing import Optional

from app.core.exceptions import AppException
from app.core.security import hash_password

from .repository import UserRepository
from .schema import UserCreate, UserUpdate


class UserNotFoundException(AppException):

    def __init__(self, user_id: int):
        super().__init__(
            status_code=404,
            message=f"User with id {user_id} not found."
        )


class EmailAlreadyExistsException(AppException):

    def __init__(self, email: str):
        super().__init__(
            status_code=409,
            message=f"A user with email '{email}' already exists."
        )


class UserService:

    def __init__(self, db):
        self.db = db
        self.repo = UserRepository(db)

    def create_user(self, payload: UserCreate, created_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_email(payload.email, active_only=False)
        if existing:
            raise EmailAlreadyExistsException(payload.email)

        user_id = self.repo.create_user(
            name=payload.name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role=payload.role,
            status=payload.status,
            avatar_url=payload.avatar_url,
            two_factor_enabled=payload.two_factor_enabled,
            created_by=created_by,
        )

        return self.repo.get_by_id(user_id, active_only=False)

    def get_user(self, user_id: int) -> dict:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundException(user_id)
        return user

    def list_users(
        self,
        name: Optional[str] = None,
        email: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.repo.get_all(
            name=name,
            email=email,
            role=role,
            status=status,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )

    def update_user(self, user_id: int, payload: UserUpdate, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(user_id, active_only=False)
        if not existing:
            raise UserNotFoundException(user_id)

        data = payload.get_update_fields()

        if "email" in data and data["email"] != existing["email"]:
            duplicate = self.repo.get_by_email(data["email"], active_only=False)
            if duplicate:
                raise EmailAlreadyExistsException(data["email"])

        if "password" in data:
            data["password_hash"] = hash_password(data.pop("password"))

        if not data:
            return existing

        return self.repo.update_user(user_id, data, updated_by=updated_by)

    def delete_user(self, user_id: int, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(user_id, active_only=False)
        if not existing:
            raise UserNotFoundException(user_id)

        self.repo.soft_delete_user(user_id, updated_by=updated_by)

        existing["is_active"] = False
        existing["status"] = "Inactive"
        return existing
