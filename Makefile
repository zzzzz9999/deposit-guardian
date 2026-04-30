# DepositGuardian v3 Makefile
# Uses: Docker Compose, Python (uv/pip), Node (npm)

.PHONY: help up down dev build logs shell-be shell-fe migrate seed \
        install-be install-fe lint-be lint-fe test-be clean

# ── Config ────────────────────────────────────────────────────────────────────
COMPOSE       = docker compose
COMPOSE_DEV   = docker compose -f docker-compose.yml -f docker-compose.dev.yml
BE_SERVICE    = backend
FE_SERVICE    = frontend

# ── Help ──────────────────────────────────────────────────────────────────────
help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Docker ────────────────────────────────────────────────────────────────────
up:       ## Start all services (production mode)
	$(COMPOSE) up -d

down:     ## Stop all services
	$(COMPOSE) down

dev:      ## Start all services (dev mode with hot-reload)
	$(COMPOSE_DEV) up

build:    ## Rebuild all images
	$(COMPOSE) build

logs:     ## Tail logs
	$(COMPOSE) logs -f

logs-be:  ## Tail backend logs
	$(COMPOSE) logs -f $(BE_SERVICE)

logs-fe:  ## Tail frontend logs
	$(COMPOSE) logs -f $(FE_SERVICE)

# ── Shells ────────────────────────────────────────────────────────────────────
shell-be:  ## Open shell in backend container
	$(COMPOSE) exec $(BE_SERVICE) bash

shell-fe:  ## Open shell in frontend container
	$(COMPOSE) exec $(FE_SERVICE) sh

# ── Database ──────────────────────────────────────────────────────────────────
migrate:   ## Run Alembic migrations
	$(COMPOSE) exec $(BE_SERVICE) alembic upgrade head

migrate-create:  ## Create new migration (NAME=<description>)
	$(COMPOSE) exec $(BE_SERVICE) alembic revision --autogenerate -m "$(NAME)"

seed:      ## Seed cases into DB
	$(COMPOSE) exec $(BE_SERVICE) python -c "from app.db.session import *; import asyncio; print('Use write_cases.py')"

# ── Local dev (without Docker) ────────────────────────────────────────────────
install-be:  ## Install backend deps locally
	cd backend && pip install -e ".[dev]"

install-fe:  ## Install frontend deps locally
	cd frontend && npm install

run-be:    ## Run backend locally
	cd backend && alembic upgrade head && uvicorn app.main:app --reload --port 8000

run-fe:    ## Run frontend locally
	cd frontend && npm run dev

# ── Quality ───────────────────────────────────────────────────────────────────
lint-be:   ## Lint backend (ruff)
	cd backend && ruff check . --fix

format-be: ## Format backend (ruff)
	cd backend && ruff format .

lint-fe:   ## Lint frontend
	cd frontend && npm run lint

type-fe:   ## Type-check frontend
	cd frontend && npm run type-check

test-be:   ## Run backend tests
	cd backend && pytest -v

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:     ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	rm -rf frontend/.next frontend/node_modules backend/.venv 2>/dev/null || true

clean-docker:  ## Remove containers, images, volumes (DESTRUCTIVE)
	$(COMPOSE) down -v --remove-orphans
	docker image prune -f
