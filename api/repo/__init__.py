from flask import Blueprint

bp = Blueprint("repo", __name__, url_prefix="/repo")

from . import routes  # noqa: E402, F401
