from mysql.connector import Error
from app.core.database import get_db_connection


def create_login(login):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

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

    login_id = cursor.lastrowid

    cursor.execute("SELECT * FROM login WHERE id = %s", (login_id,))
    result = cursor.fetchone()

    cursor.close()
    connection.close()

    return result


def get_all_logins():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM login")

    result = cursor.fetchall()

    cursor.close()
    connection.close()

    return result