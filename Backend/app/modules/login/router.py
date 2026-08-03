from fastapi import APIRouter

from .schema import LoginCreate
from .service import create_login, get_all_logins

router = APIRouter(
    prefix="/login",
    tags=["Login"]
)


@router.post("/")
def add_login(login: LoginCreate):
    return create_login(login)


@router.get("/")
def fetch_logins():
    return get_all_logins()