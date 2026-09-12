APP_NAME    := oriweave
PNPM        := pnpm
COMPOSE 		:= docker compose

help: ## Show this help
	@echo ""
	@echo "  $(APP_NAME) — available commands"
	@echo "  ─────────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ==========================================
# Infra (local)
# ==========================================

infra: ## Start local services (Postgres, etc.)
	$(COMPOSE) up -d --force-recreate

infra-down: ## Stop local services
	$(COMPOSE) down -v

infra-logs: ## Tail local service logs
	$(COMPOSE) logs -f

# ==========================================
# CI/CD & Deployment
# ==========================================

install: ## Install all dependencies
	$(PNPM) install

build-packages:
	$(PNPM) --filter "./packages/**" run build

build: build-packages
	$(PNPM) --filter "./apps/**" --filter "./docs" run build

typecheck: build-packages
	$(PNPM) --recursive --if-present run typecheck

test:
	pnpm --recursive --if-present run test

clean:
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
	find . -name "dist" -type d -prune -exec rm -rf '{}' +

# ==========================================
# Local Development
# ==========================================

dev: build-packages
	$(PNPM) --filter "./apps/**" --filter "./docs" --parallel run dev

dev-api: build-packages ## Start the api server
	$(PNPM) --filter "@oriweave/api" run dev

dev-web: build-packages ## Start the web server
	$(PNPM) --filter "./apps/web" run dev

dev-docs: ## Start the docs server
	$(PNPM) --filter "./docs" run dev

# ==========================================
# Linting && Formatting
# ==========================================

lint: ## Run ESLint
	$(PNPM) run lint

lint-fix: ## Run ESLint with auto-fix
	$(PNPM) run lint:fix

format: ## Format all files with Prettier
	$(PNPM) run format

format-check: ## Check formatting without writing
	$(PNPM) run format:check

.PHONY: help install dev build preview clean typecheck lint docker-build docker-run \
	core-typecheck renderer-typecheck web-typecheck api-typecheck new-lockfile
