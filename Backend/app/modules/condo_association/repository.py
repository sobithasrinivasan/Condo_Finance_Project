from typing import Optional

from .model import TABLE_NAME


class CondoAssociationRepository:

    def __init__(self, db):
        self.db = db

    def create_association(
        self,
        name: str,
        address: str,
        established: Optional[int] = None,
        unit_count: int = 8,
        status: str = "Active",
        created_by: Optional[int] = None,
    ) -> int:
        cursor = self.db.cursor()

        query = f"""
        INSERT INTO {TABLE_NAME}
        (
            name, address, established, unit_count, status, created_by, updated_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                name,
                address,
                established,
                unit_count,
                status,
                created_by,
                created_by,
            ),
        )

        self.db.commit()

        return cursor.lastrowid

    def get_by_id(self, association_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"SELECT * FROM {TABLE_NAME} WHERE id = %s"
        if active_only:
            query += " AND is_active = 1"

        cursor.execute(query, (association_id,))

        return cursor.fetchone()

    def get_by_name(self, name: str, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"SELECT * FROM {TABLE_NAME} WHERE name = %s"
        if active_only:
            query += " AND is_active = 1"

        cursor.execute(query, (name,))

        return cursor.fetchone()

    def get_all(
        self,
        name: Optional[str] = None,
        status: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where = ["is_active = %s"]
        params: list = [int(is_active)]

        if name:
            where.append("name LIKE %s")
            params.append(f"%{name}%")
        if status:
            where.append("status = %s")
            params.append(status)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} WHERE {where_clause}", params
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        query = f"""
        SELECT *
        FROM {TABLE_NAME}
        WHERE {where_clause}
        ORDER BY name ASC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [page_size, offset])
        rows = cursor.fetchall()

        return rows, total

    def update_association(
        self, association_id: int, data: dict, updated_by: Optional[int] = None
    ) -> Optional[dict]:
        if not data:
            return self.get_by_id(association_id, active_only=False)

        cursor = self.db.cursor()

        columns = list(data.keys())
        values = [int(v) if isinstance(v, bool) else v for v in data.values()]

        set_clauses = [f"{col} = %s" for col in columns]
        set_clauses.append("updated_by = %s")
        set_clauses.append("version = version + 1")

        params = values + [updated_by, association_id]

        query = f"""
        UPDATE {TABLE_NAME}
        SET {", ".join(set_clauses)}
        WHERE id = %s
        """

        cursor.execute(query, params)
        self.db.commit()

        return self.get_by_id(association_id, active_only=False)

    def soft_delete_association(
        self, association_id: int, updated_by: Optional[int] = None
    ) -> None:
        cursor = self.db.cursor()

        query = f"""
        UPDATE {TABLE_NAME}
        SET is_active = 0, status = 'Inactive', updated_by = %s, version = version + 1
        WHERE id = %s
        """

        cursor.execute(query, (updated_by, association_id))
        self.db.commit()

