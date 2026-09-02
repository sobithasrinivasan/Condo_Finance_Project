from app.core.database import get_db_connection


def get_all():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM vendors")
    vendors = cursor.fetchall()

    cursor.close()
    conn.close()

    return vendors


def get_by_id(vendor_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM vendors WHERE id = %s",
        (vendor_id,)
    )

    vendor = cursor.fetchone()

    cursor.close()
    conn.close()

    return vendor


def create(vendor: dict):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO vendors
        (
            association_id,
            vendor_name,
            category,
            contact_person,
            phone,
            email,
            address,
            tin_number,
            payment_terms,
            account_reference
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    values = (
        vendor["association_id"],
        vendor["vendor_name"],
        vendor.get("category"),
        vendor.get("contact_person"),
        vendor.get("phone"),
        vendor.get("email"),
        vendor.get("address"),
        vendor.get("tin_number"),
        vendor.get("payment_terms"),
        vendor.get("account_reference"),
    )

    cursor.execute(query, values)
    conn.commit()

    vendor_id = cursor.lastrowid

    cursor.close()
    conn.close()

    return get_by_id(vendor_id)


def update(vendor_id: int, vendor: dict):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM vendors WHERE id=%s",
        (vendor_id,)
    )

    existing = cursor.fetchone()

    if not existing:
        cursor.close()
        conn.close()
        return None

    association_id = vendor.get("association_id", existing["association_id"])
    vendor_name = vendor.get("vendor_name", existing["vendor_name"])
    category = vendor.get("category", existing["category"])
    contact_person = vendor.get("contact_person", existing["contact_person"])
    phone = vendor.get("phone", existing["phone"])
    email = vendor.get("email", existing["email"])
    address = vendor.get("address", existing["address"])
    tin_number = vendor.get("tin_number", existing["tin_number"])
    payment_terms = vendor.get("payment_terms", existing["payment_terms"])
    account_reference = vendor.get("account_reference", existing["account_reference"])
    status = vendor.get("status", existing["status"])

    query = """
        UPDATE vendors
        SET
            association_id=%s,
            vendor_name=%s,
            category=%s,
            contact_person=%s,
            phone=%s,
            email=%s,
            address=%s,
            tin_number=%s,
            payment_terms=%s,
            account_reference=%s,
            status=%s
        WHERE id=%s
    """

    values = (
        association_id,
        vendor_name,
        category,
        contact_person,
        phone,
        email,
        address,
        tin_number,
        payment_terms,
        account_reference,
        status,
        vendor_id
    )

    cursor.execute(query, values)
    conn.commit()

    cursor.close()
    conn.close()

    return get_by_id(vendor_id)


def delete(vendor_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM vendors WHERE id=%s",
        (vendor_id,)
    )

    conn.commit()

    deleted = cursor.rowcount > 0

    cursor.close()
    conn.close()

    return {
        "success": deleted,
        "message": "Vendor deleted successfully" if deleted else "Vendor not found"
    }