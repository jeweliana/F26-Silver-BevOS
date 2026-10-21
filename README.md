### Team Silver - Fall 2026

# Members

  - cstkennedy - Thomas Kennedy - tkennedy@cs.odu.edu
  - Jeweliana - Jeweliana Beayon - jbeay001@odu.edu
  - Yozongu - Phillip De Guzman - Pdegu001@odu.edu
  - AmberBP1 - Amber Ponder - Apond003@odu.edu
  - JFernandes3435 - Julian Fernandes - Jfern015@odu.edu
  - mkirby29 - Matt Kirby - mkirb007@odu.edu
  - Fee33 - Ryan Fee - rfee001@odu.edu  

# Silver-BevOS

Split into two apps sharing one repo:

- `backend/` — Django (API, models, auth, analytics)
- `frontend/` — plain HTML/CSS/JS, served by Nginx

## Run instruction

    docker compose up -d --build
    # frontend → http://localhost:8080
    # API      → http://localhost:8000

## Quick database check

Confirms the stack is up and demo data loaded. Table and column names follow the ERD.

```bash
docker compose exec db psql -U bevos -d bevos -c \
  "select username, email, role, full_name from accounts_user;"

docker compose exec db psql -U bevos -d bevos -c \
  "select (select count(*) from deals) deals, (select count(*) from statuses) statuses;"
```

