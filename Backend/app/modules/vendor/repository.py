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
        (name, category, phone, email, address)
        VALUES (%s, %s, %s, %s, %s)
    """

    values = (
        vendor["name"],
        vendor["category"],
        vendor.get("phone"),
        vendor.get("email"),
        vendor.get("address"),
    )

    cursor.execute(query, values)
    conn.commit()

    vendor_id = cursor.lastrowid

    cursor.close()
    conn.close()

    return get_by_id(vendor_id)


from app.core.database import get_db_connection


def update(vendor_id: int, vendor: dict):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Get existing vendor
    cursor.execute("SELECT * FROM vendors WHERE id = %s", (vendor_id,))
    existing = cursor.fetchone()

    if not existing:
        cursor.close()
        conn.close()
        return None

    # Keep existing values if not provided
    name = vendor.get("name", existing["name"])
    category = vendor.get("category", existing["category"])
    phone = vendor.get("phone", existing["phone"])
    email = vendor.get("email", existing["email"])
    address = vendor.get("address", existing["address"])

    # Preserve status if not provided
    status = vendor.get("status", existing["status"])

    # Validate ENUM value
    if status not in ("Active", "Inactive"):
        status = existing["status"]

    query = """
        UPDATE vendors
        SET
            name = %s,
            category = %s,
            phone = %s,
            email = %s,
            address = %s,
            status = %s
        WHERE id = %s
    """

    values = (
        name,
        category,
        phone,
        email,
        address,
        status,
        vendor_id,
    )

    print("UPDATE VALUES:", values)  # Debug

    cursor.execute(query, values)
    conn.commit()

    cursor.execute("SELECT * FROM vendors WHERE id = %s", (vendor_id,))
    updated_vendor = cursor.fetchone()

    cursor.close()
    conn.close()

    return updated_vendor


def delete(vendor_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM vendors WHERE id = %s",
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