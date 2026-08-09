from typing import Optional

from app.core.audit import ACTION_CREATE, ACTION_SOFT_DELETE, ACTION_UPDATE, AuditLogger
from app.core.exceptions import AppException

from .model import TABLE_NAME
from .repository import CondoAssociationRepository
from .schema import CondoAssociationCreate, CondoAssociationUpdate


class CondoAssociationNotFoundException(AppException):

    def __init__(self, association_id: int):
        super().__init__(
            status_code=404,
            message=f"Condo association with id {association_id} not found."
        )


class AssociationNameAlreadyExistsException(AppException):

    def __init__(self, name: str):
        super().__init__(
            status_code=409,
            message=f"A condo association with name '{name}' already exists."
        )


class CondoAssociationService:

    def __init__(self, db):
        self.db = db
        self.repo = CondoAssociationRepository(db)
        self.audit = AuditLogger(db)

    def create_association(
        self, payload: CondoAssociationCreate, created_by: Optional[int] = None
    ) -> dict:
        existing = self.repo.get_by_name(payload.name, active_only=False)
        if existing:
            raise AssociationNameAlreadyExistsException(payload.name)

        association_id = self.repo.create_association(
            name=payload.name,
            address=payload.address,
            established=payload.established,
            unit_count=payload.unit_count,
            status=payload.status,
            created_by=created_by,
        )

        association = self.repo.get_by_id(association_id, active_only=False)
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=association_id,
            action=ACTION_CREATE,
            new_values=association,
            acted_by=created_by,
        )
        return association

    def get_association(self, association_id: int) -> dict:
        association = self.repo.get_by_id(association_id)
        if not association:
            raise CondoAssociationNotFoundException(association_id)
        return association

    def list_associations(
        self,
        name: Optional[str] = None,
        status: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.repo.get_all(
            name=name,
            status=status,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )

    def update_association(
        self,
        association_id: int,
        payload: CondoAssociationUpdate,
        updated_by: Optional[int] = None,
    ) -> dict:
        existing = self.repo.get_by_id(association_id, active_only=False)
        if not existing:
            raise CondoAssociationNotFoundException(association_id)

        data = payload.get_update_fields()

        if "name" in data and data["name"] != existing["name"]:
            duplicate = self.repo.get_by_name(data["name"], active_only=False)
            if duplicate:
                raise AssociationNameAlreadyExistsException(data["name"])

        if not data:
            return existing

        updated = self.repo.update_association(association_id, data, updated_by=updated_by)
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=association_id,
            action=ACTION_UPDATE,
            old_values=existing,
            new_values=updated,
            acted_by=updated_by,
        )
        return updated

    def delete_association(
        self, association_id: int, updated_by: Optional[int] = None
    ) -> dict:
        existing = self.repo.get_by_id(association_id, active_only=False)
        if not existing:
            raise CondoAssociationNotFoundException(association_id)

        old_values = existing.copy()

        self.repo.soft_delete_association(association_id, updated_by=updated_by)

        self.audit.log(
            table_name=TABLE_NAME,
            record_id=association_id,
            action=ACTION_SOFT_DELETE,
            old_values=old_values,
            new_values={"is_active": False, "status": "Inactive"},
            acted_by=updated_by,
        )

        existing["is_active"] = False
        existing["status"] = "Inactive"
        return existing

