from flask import Blueprint

# Parent blueprint mounted under `/api`.
api_bp = Blueprint("api", __name__, url_prefix="/api")

# Mount feature blueprints.
from .repo import bp as repo_bp  # noqa: E402

api_bp.register_blueprint(repo_bp)
