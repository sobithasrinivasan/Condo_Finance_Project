from fastapi import HTTPException


def require_admin(db, user_id: int) -> dict:
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        "SELECT id, role FROM users WHERE id = %s AND is_active = 1",
        (user_id,),
    )
    user = cursor.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")

    return user
