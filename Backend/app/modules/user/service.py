from typing import Optional

from app.core.audit import ACTION_CREATE, ACTION_SOFT_DELETE, ACTION_UPDATE, AuditLogger
from app.core.exceptions import AppException
from app.core.security import hash_password

from .model import TABLE_NAME
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
        self.audit = AuditLogger(db)

    @staticmethod
    def _without_password_hash(row: dict) -> dict:
        """Return a copy of the user row with the sensitive password_hash removed."""
        return {k: v for k, v in row.items() if k != "password_hash"}

    def create_user(self, payload: UserCreate, created_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_email(payload.email, active_only=False)
        if existing:
            raise EmailAlreadyExistsException(payload.email)

        user_id = self.repo.create_user(
            full_name=payload.full_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role=payload.role,
            status=payload.status,
            phone_number=payload.phone_number,
            two_factor_enabled=payload.two_factor_enabled,
            created_by=created_by,
        )

        user = self.repo.get_by_id(user_id, active_only=False)
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=user_id,
            action=ACTION_CREATE,
            new_values=self._without_password_hash(user),
            acted_by=created_by,
        )
        return user

    def get_user(self, user_id: int) -> dict:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundException(user_id)
        return user

    def list_users(
        self,
        full_name: Optional[str] = None,
        email: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.repo.get_all(
            full_name=full_name,
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

        password_changed = "password_hash" in data

        updated = self.repo.update_user(user_id, data, updated_by=updated_by)
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=user_id,
            action=ACTION_UPDATE,
            old_values=self._without_password_hash(existing),
            new_values=self._without_password_hash(updated),
            acted_by=updated_by,
            detail="password updated" if password_changed else None,
        )
        return updated

    def delete_user(self, user_id: int, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(user_id, active_only=False)
        if not existing:
            raise UserNotFoundException(user_id)

        old_values = self._without_password_hash(existing)

        self.repo.soft_delete_user(user_id, updated_by=updated_by)

        self.audit.log(
            table_name=TABLE_NAME,
            record_id=user_id,
            action=ACTION_SOFT_DELETE,
            old_values=old_values,
            new_values={"is_active": False, "status": "Inactive"},
            acted_by=updated_by,
        )

        existing["is_active"] = False
        existing["status"] = "Inactive"
        return existing
