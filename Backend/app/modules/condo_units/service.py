from typing import Optional

from app.core.exceptions import AppException

from .repository import CondoUnitRepository
from .schema import CondoUnitCreate, CondoUnitUpdate


class CondoUnitNotFoundException(AppException):

    def __init__(self, unit_id: int):
        super().__init__(
            status_code=404,
            message=f"Condo unit with id {unit_id} not found."
        )


class UnitNumberAlreadyExistsException(AppException):

    def __init__(self, unit_number: str):
        super().__init__(
            status_code=409,
            message=f"A condo unit with number '{unit_number}' already exists."
        )


class CondoUnitService:

    def __init__(self, db):
        self.db = db
        self.repo = CondoUnitRepository(db)

    def create_unit(self, payload: CondoUnitCreate, created_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_unit_number(
            payload.unit_number, association_id=payload.association_id, active_only=False
        )
        if existing:
            raise UnitNumberAlreadyExistsException(payload.unit_number)

        unit_id = self.repo.create_unit(
            association_id=payload.association_id,
            unit_number=payload.unit_number,
            owner_name=payload.owner_name,
            owner_email=payload.owner_email,
            owner_phone=payload.owner_phone,
            address=payload.address,
            monthly_hoa_amount=payload.monthly_hoa_amount,
            status=payload.status,
            created_by=created_by,
        )

        return self.repo.get_by_id(unit_id, active_only=False)

    def get_unit(self, unit_id: int) -> dict:
        unit = self.repo.get_by_id(unit_id)
        if not unit:
            raise CondoUnitNotFoundException(unit_id)
        return unit

    def list_units(
        self,
        association_id: Optional[int] = None,
        unit_number: Optional[str] = None,
        owner_name: Optional[str] = None,
        status: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.repo.get_all(
            association_id=association_id,
            unit_number=unit_number,
            owner_name=owner_name,
            status=status,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )

    def update_unit(self, unit_id: int, payload: CondoUnitUpdate, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(unit_id, active_only=False)
        if not existing:
            raise CondoUnitNotFoundException(unit_id)

        data = payload.get_update_fields()

        if "unit_number" in data and data["unit_number"] != existing["unit_number"]:
            duplicate = self.repo.get_by_unit_number(
                data["unit_number"], association_id=existing["association_id"], active_only=False
            )
            if duplicate:
                raise UnitNumberAlreadyExistsException(data["unit_number"])

        if not data:
            return existing

        return self.repo.update_unit(unit_id, data, updated_by=updated_by)

    def delete_unit(self, unit_id: int, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(unit_id, active_only=False)
        if not existing:
            raise CondoUnitNotFoundException(unit_id)

        self.repo.soft_delete_unit(unit_id, updated_by=updated_by)

        existing["is_active"] = False
        existing["status"] = "Inactive"
        return existing
