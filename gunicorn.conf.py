"""Gunicorn config for local development."""

from pathlib import Path

bind = "127.0.0.1:8000"
reload = True

# Watch Jinja2 templates and Vite manifest so gunicorn reloads on changes
_webapp = Path(__file__).parent
reload_extra_files = [
    *_webapp.glob("templates/**/*.html"),
    _webapp / "static" / "dist" / ".vite" / "manifest.json",
]
