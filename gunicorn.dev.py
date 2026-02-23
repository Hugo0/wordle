"""Gunicorn config for local development only. Not auto-discovered."""

bind = "127.0.0.1:8000"
workers = 4
reload = True
preload_app = True
