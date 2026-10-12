from . import repository


def create_login(login):
    return repository.create_login(login)


def get_all_logins():
    return repository.get_all_logins()