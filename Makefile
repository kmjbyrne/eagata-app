# The app's Docker commands, with the environment as a parameter. `make help`
# lists them. ENV picks the settings file: development (the default) uses
# .env, anything else uses .env.<ENV>, such as ENV=production.
#
#   make up ENV=production         MariaDB and both slots
#   make migrate ENV=production    the tables, as the migrator
#   make app-user ENV=production   the app's own, limited database user

SHELL := bash
.DEFAULT_GOAL := help

ENV ?= development
ENV_FILE := $(if $(filter development,$(ENV)),.env,.env.$(ENV))
COMPOSE := docker compose --env-file $(ENV_FILE) -f docker-compose.yml -f docker-compose.build.yml

# MariaDB's root password, generated on its first start and printed once to
# its log. Asked for when the log no longer has it, such as after the
# container was recreated: keep a copy.
ROOT_PASSWORD = root=$$($(COMPOSE) logs --no-log-prefix mariadb 2>/dev/null | sed -n 's/.*GENERATED ROOT PASSWORD: //p' | tail -n 1 | tr -d '\r'); \
	[[ -n $$root ]] || { read -rsp "MariaDB root password: " root; echo; }

# Which build is running, for Settings, Application.
export GIT_COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null)
export GIT_COMMIT_DATE ?= $(shell git show -s --format=%cI HEAD 2>/dev/null)

.PHONY: help check build up down ps logs migrate app-user admin admin-password db-shell root-password

help: ## List the commands
	@echo "Usage: make <command> [ENV=production] [SLOT=blue|green]"
	@echo
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{ printf "  %-10s %s\n", $$1, $$2 }'
	@echo
	@echo "Settings: $(ENV_FILE)"

env-file:
	@test -f $(ENV_FILE) || { echo "No $(ENV_FILE). Copy .env.example and fill it in." >&2; exit 2; }

check: env-file ## List required settings the env file leaves empty
	@missing=$$(grep -h '# required' docker-compose.yml | grep -o '$${[A-Z_][A-Z0-9_]*' | sed 's/^$${//' | sort -u | while read -r key; do \
	  value=$$(grep -E "^$$key=" $(ENV_FILE) | tail -n 1 | cut -d= -f2-); \
	  [[ -n $${!key:-} || -n $$value ]] || echo "  $$key"; \
	done); \
	if [[ -n $$missing ]]; then echo "$(ENV_FILE) is missing required settings:"; echo "$$missing"; exit 1; fi; \
	echo "$(ENV_FILE) has every required setting."

build: ## Build the app and tools images from this checkout
	$(COMPOSE) build app-$(or $(SLOT),blue) tools

up: check ## Build and start MariaDB and both slots, or one: SLOT=green
	$(COMPOSE) --profile db $(if $(SLOT),,--profile app) up -d --build $(if $(SLOT),mariadb app-$(SLOT))

down: env-file ## Stop one slot, SLOT=blue, or everything
	$(COMPOSE) --profile db --profile app $(if $(SLOT),stop app-$(SLOT),down)

ps: env-file ## What's running, and on which ports
	$(COMPOSE) --profile db --profile app ps

logs: env-file ## Follow a slot's log: SLOT=blue
	$(COMPOSE) logs -f app-$(or $(SLOT),blue)

migrate: check ## Apply database migrations
	$(COMPOSE) run --rm --build tools drizzle-kit migrate

# Creates the app's database user. It fills in etc/sql/create-appuser.sql with
# the user, password and database from NUXT_DATABASE_URL, as Compose reads it,
# saves the result to .out/<ENV> so you can see what ran, and runs it as root.
# That file holds the password: .out is git-ignored, kept out of Docker
# builds, and readable by you alone.
app-user: check ## Create the app's database user, from NUXT_DATABASE_URL
	@url=$$($(COMPOSE) --profile app config | grep -m 1 'NUXT_DATABASE_URL:' | sed -E 's/.*NUXT_DATABASE_URL: "?([^"]*)"?$$/\1/'); \
	[[ $$url =~ ^mysql://([A-Za-z0-9_]+):([^@]+)@[^/]+/([A-Za-z0-9_]+)$$ ]] || { echo "NUXT_DATABASE_URL isn't mysql://<user>:<password>@<host>/<database>" >&2; exit 1; }; \
	user=$${BASH_REMATCH[1]} password=$${BASH_REMATCH[2]} database=$${BASH_REMATCH[3]}; \
	sql=$$(<etc/sql/create-appuser.sql); sql=$${sql//APP_USER/$$user}; sql=$${sql//APP_PASSWORD/$$password}; sql=$${sql//APP_DATABASE/$$database}; \
	umask 077; mkdir -p .out/$(ENV); printf '%s\n' "$$sql" > .out/$(ENV)/create-appuser.sql; \
	$(ROOT_PASSWORD); \
	MYSQL_PWD="$$root" $(COMPOSE) exec -T -e MYSQL_PWD mariadb mariadb -uroot < .out/$(ENV)/create-appuser.sql && \
	echo "$$user may now read and write $$database, but not change its tables. Ran .out/$(ENV)/create-appuser.sql."

admin: check ## Make EMAIL a platform admin, printing a set-password link
	@test -n "$(EMAIL)" || { echo "Give the email: make admin EMAIL=you@example.com" >&2; exit 2; }
	$(COMPOSE) run --rm --build tools tsx scripts/platform-grant.ts $(EMAIL)

admin-password: check ## Make EMAIL a platform admin, with a password you're asked for
	@test -n "$(EMAIL)" || { echo "Give the email: make admin-password EMAIL=you@example.com" >&2; exit 2; }
	@read -rsp "Password for $(EMAIL), at least 10 characters: " pw; echo; \
	read -rsp "Again: " again; echo; \
	[[ $$pw == "$$again" ]] || { echo "They don't match." >&2; exit 1; }; \
	ADMIN_PASSWORD="$$pw" $(COMPOSE) run --rm --build -e ADMIN_PASSWORD tools tsx scripts/platform-grant.ts $(EMAIL)

db-shell: env-file ## Open MariaDB as root, for one-off administration
	@$(ROOT_PASSWORD); \
	MYSQL_PWD="$$root" $(COMPOSE) exec -e MYSQL_PWD mariadb mariadb -uroot

root-password: env-file ## Print MariaDB's generated root password, from its log
	@$(COMPOSE) logs --no-log-prefix mariadb 2>/dev/null | sed -n 's/.*GENERATED ROOT PASSWORD: //p' | tail -n 1 | tr -d '\r' | grep . \
	  || { echo "Not in MariaDB's log any more: the container was recreated since its first start." >&2; exit 1; }
