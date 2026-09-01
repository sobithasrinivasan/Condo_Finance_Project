import mysql.connector
from app.core.settings import settings

def clear_tables():
    conn = mysql.connector.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
    )
    cursor = conn.cursor()

    try:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        
        print("Clearing payables...")
        cursor.execute("TRUNCATE TABLE payables;")
        
        print("Clearing invoices...")
        cursor.execute("TRUNCATE TABLE invoices;")
        
        print("Clearing gmail_import_logs...")
        cursor.execute("TRUNCATE TABLE gmail_import_logs;")
        
        print("Clearing document_extraction for INVOICE & EMAIL...")
        cursor.execute("DELETE FROM document_extraction WHERE document_type = 'INVOICE' OR source = 'EMAIL';")
        
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        conn.commit()
        print("All tables cleared successfully!")
    except Exception as e:
        print("Error clearing tables:", e)
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    clear_tables()
