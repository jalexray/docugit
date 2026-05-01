from flask import Flask


def create_app() -> Flask:
    app = Flask(__name__, static_folder='../dist', static_url_path='/')

    from .config import Config
    app.config.from_object(Config)

    # Parent API blueprint mounted at `/api`, with feature blueprints nested under it.
    from .api_bp import api_bp
    app.register_blueprint(api_bp)

    # Serve the React SPA entrypoint at the site root.
    @app.get("/")
    def index():
        return app.send_static_file("index.html")

    return app
