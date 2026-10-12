import urllib.parse

import mysql.connector

from app.core.settings import settings


def check_db_connection():
    db = mysql.connector.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=urllib.parse.unquote(settings.DB_PASSWORD),
        database=settings.DB_NAME
    )
    db.close()


def get_db_connection():
    return mysql.connector.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=urllib.parse.unquote(settings.DB_PASSWORD),
        database=settings.DB_NAME
    )


def get_db():
    db = get_db_connection()
    try:
        yield db
    finally:
        db.close()