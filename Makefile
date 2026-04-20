.PHONY: up down build logs db-shell clean

up:
	podman-compose up -d

build:
	podman-compose up -d --build

down:
	podman-compose down

logs-backend:
	podman logs -f reclaim_backend

db-shell:
	podman exec -it reclaim_db psql -U admin -d smart_reimburse

setup:
	python3.12 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r backend/requirements.txt

clean:
	podman-compose down -v
	rm -rf backend/__pycache__
	rm -rf .venv
