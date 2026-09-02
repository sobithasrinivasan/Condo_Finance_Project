from app.core.database import get_db_connection


def create_login(login):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True, buffered=True)

    try:
        # Check if the same email and role already exist
        cursor.execute(
            """
            SELECT *
            FROM login
            WHERE email = %s
              AND role = %s
            LIMIT 1
            """,
            (login.email, login.role)
        )

        existing_user = cursor.fetchone()

        if existing_user:
            return existing_user

        
        query = """
            INSERT INTO login (
                role,
                email,
                password_hash,
                created_by
            )
            VALUES (%s, %s, %s, %s)
        """

        values = (
            login.role,
            login.email,
            login.password_hash,
            login.created_by
        )

        cursor.execute(query, values)
        connection.commit()

        user_id = cursor.lastrowid

        cursor.execute(
            "SELECT * FROM login WHERE id = %s",
            (user_id,)
        )

        return cursor.fetchone()

    finally:
        cursor.close()
        connection.close()


def get_all_logins():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True, buffered=True)

    try:
        cursor.execute("""
            SELECT
                id,
                role,
                email,
                password_hash,
                status,
                last_login,
                created_at,
                updated_at,
                created_by,
                updated_by,
                is_active
            FROM login
            ORDER BY id
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()