# Bizora monorepo helpers
.PHONY: test build up up-full down docker-build smoke

test:
	npm test

build:
	npm run build

up:
	docker compose up --build

up-full:
	docker compose --profile full up --build

down:
	docker compose down

docker-build:
	docker build -f backend/Dockerfile -t bizora-api .
	docker build -f frontend/Dockerfile -t bizora-web .
	docker build -f admin/Dockerfile -t bizora-admin .

smoke:
	./scripts/smoke-docker.sh
