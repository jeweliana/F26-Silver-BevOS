# Silver-BevOS

Split into two apps sharing one repo:

- `backend/` — Django (API, models, auth, analytics)
- `frontend/` — plain HTML/CSS/JS, served by Nginx

## Develop

    docker compose up
    # frontend → http://localhost:8080
    # API      → http://localhost:8000

Shell access:

    docker compose exec web python manage.py shell
