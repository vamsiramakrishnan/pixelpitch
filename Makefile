SHELL := /bin/bash

UV ?= uv
PYTHON ?= python
DECK ?= image-led-magazine
TAG ?= raster-rich
SLIDIFY_ENGINE ?= engines/slidify
BENCH_ROOT ?= $(SLIDIFY_ENGINE)/_bench
SLIDIFY_PKG ?= $(SLIDIFY_ENGINE)/slidify
SLIDIFY_COMPONENTS ?= $(SLIDIFY_ENGINE)/components
HARVEST_OUT ?= $(BENCH_ROOT)/reports/harvest/bench-signals.json
HARVEST_REPORT ?= $(BENCH_ROOT)/reports/harvest/bench-report.md
HARVEST_INPUT ?= $(BENCH_ROOT)/corpus
HARVEST_PROGRESS ?= $(BENCH_ROOT)/reports/harvest/bench-progress.jsonl
HARVEST_PROGRESS_MODE ?= plain
MECHANISMS_OUT ?= $(BENCH_ROOT)/reports/harvest/mechanisms.json
MECHANISMS_REPORT ?= $(BENCH_ROOT)/reports/harvest/mechanisms.md
PORT ?= 15999

UV_CACHE_DIR ?= $(CURDIR)/.uv-cache
UV_PROJECT_ENVIRONMENT ?= $(CURDIR)/.venv
PLAYWRIGHT_BROWSERS_PATH ?= $(CURDIR)/.ms-playwright
UV_ENV := UV_CACHE_DIR=$(UV_CACHE_DIR) UV_PROJECT_ENVIRONMENT=$(UV_PROJECT_ENVIRONMENT) PLAYWRIGHT_BROWSERS_PATH=$(PLAYWRIGHT_BROWSERS_PATH)
UV_RUN := $(UV_ENV) $(UV) run

.PHONY: help sync bootstrap playwright doctor patterns test lint check \
	playwright-deps bench-index bench-compose bench-compose-tag bench-render bench-render-tag \
	bench-index-all bench-render-all bench-harvest bench-harvest-all bench-mechanisms \
	bench-app bench-run bench-run-strict bench-build clean-env \
	web daemon web-build daemon-build skills-sync skills-verify smoke bun-install \
	up dev stop status logs doctor-web pixelpitch-bootstrap \
	build-skills-corpus harvest-deck-skills

help:
	@echo "Pixelpitch (web + daemon + skills) — start here"
	@echo "  ./setup.sh                One-command setup: install Bun if needed, install deps, build, mirror skills"
	@echo "  bun run dev               Start daemon + web (http://localhost:3000)  (alias: make up)"
	@echo "  bun run stop              Stop daemon + web"
	@echo "  bun run doctor            Environment health check  (alias: make doctor-web)"
	@echo "  bun run skills:sync       Re-mirror skills/ into .claude/ and .gemini/"
	@echo ""
	@echo "Slidify (Python HTML → PPTX) — the converter used as the PPTX export backend"
	@echo "  make sync                 Install locked Python deps into .venv using .uv-cache"
	@echo "  make bootstrap            sync + install Chromium for Playwright"
	@echo "  make playwright-deps      Install Chromium plus OS libraries via Playwright"
	@echo "  make doctor               Check slidify external runtime dependencies"
	@echo "  make clean-env            Remove .venv, .uv-cache, and .ms-playwright"
	@echo ""
	@echo "Checks"
	@echo "  make lint                 Ruff check"
	@echo "  make test                 Pytest"
	@echo "  make check                lint + test"
	@echo ""
	@echo "Bench"
	@echo "  make bench-index          Rebuild $(BENCH_ROOT)/corpus/index.{json,html}"
	@echo "  make bench-index-all      Rebuild $(BENCH_ROOT)/index.{json,html}"
	@echo "  make bench-compose        Compose DECK=$(DECK)"
	@echo "  make bench-compose-tag    Compose TAG=$(TAG)"
	@echo "  make bench-render         Render composed DECK=$(DECK) to PPTX"
	@echo "  make bench-render-tag     Render composed TAG=$(TAG) to PPTX"
	@echo "  make bench-render-all     Render corpus + all deck families to PPTX"
	@echo "  make bench-harvest        Mine HARVEST_INPUT=$(HARVEST_INPUT) and write reports + progress JSONL"
	@echo "  make bench-harvest-all    Harvest corpus + decks, then rank top mechanisms"
	@echo "  make bench-mechanisms     Compose harvest JSON into top-10 mechanism plan"
	@echo "  make bench-app            Serve side-by-side viewer on PORT=$(PORT)"
	@echo "  make bench-run            Run bench static checks"
	@echo "  make bench-run-strict     Run bench static checks as a native-only gate"
	@echo "  make bench-build          Build configured bench PPTX outputs"

sync:
	$(UV_ENV) $(UV) sync --extra dev

playwright:
	$(UV_RUN) playwright install chromium

playwright-deps:
	$(UV_RUN) playwright install --with-deps chromium

bootstrap: sync playwright

doctor:
	$(UV_RUN) slidify doctor

# Regenerate the Tailwind catalog from the latest tailwindcss npm package.
# Run this after `bun add --cwd tools/pattern-gen tailwindcss@latest`
# bumps to a new major.
patterns:
	cd tools/pattern-gen && node extract-tailwind.js > ../../$(SLIDIFY_PKG)/patterns/data/tailwind.json
	@echo "Wrote $(SLIDIFY_PKG)/patterns/data/tailwind.json"
	@python3 -c "import json; d = json.load(open('$(SLIDIFY_PKG)/patterns/data/tailwind.json')); print(f\"  version={d['version']}  colors={len(d['colors'])}  radii={len(d['border_radius'])}  shadows={len(d['shadow'])}  sizes={len(d['font_size'])}  spacing={len(d['spacing_px'])}\")"

test:
	$(UV_RUN) pytest -q

lint:
	$(UV_RUN) ruff check $(SLIDIFY_PKG) $(SLIDIFY_ENGINE)/tests

check: lint test

bench-index:
	$(PYTHON) $(BENCH_ROOT)/scripts/build_corpus_index.py

bench-index-all: bench-index
	$(PYTHON) $(BENCH_ROOT)/scripts/build_bench_index.py

bench-compose: bench-index-all
	$(PYTHON) $(BENCH_ROOT)/scripts/compose_corpus.py --deck $(DECK) --force

bench-compose-tag: bench-index-all
	$(PYTHON) $(BENCH_ROOT)/scripts/compose_corpus.py --tag $(TAG) --name $(TAG) --force

bench-render: bench-compose
	$(UV_RUN) slidify convert $(BENCH_ROOT)/generated/composed/$(DECK) $(BENCH_ROOT)/generated/dist/$(DECK).pptx \
		--no-tier3 --no-oracle --quiet

bench-render-tag: bench-compose-tag
	$(UV_RUN) slidify convert $(BENCH_ROOT)/generated/composed/$(TAG) $(BENCH_ROOT)/generated/dist/$(TAG).pptx \
		--no-tier3 --no-oracle --quiet

bench-render-all: bench-index-all
	$(UV_RUN) python $(BENCH_ROOT)/build.py --skip-generate

bench-harvest: bench-index-all
	SLIDIFY_LOG_LEVEL=warning $(UV_RUN) slidify harvest $(HARVEST_INPUT) --output $(HARVEST_OUT) --top-n 80 --min-occurrences 2 \
		--progress $(HARVEST_PROGRESS_MODE) --progress-file $(HARVEST_PROGRESS)
	$(PYTHON) $(BENCH_ROOT)/scripts/summarize_harvest.py $(HARVEST_OUT) --output $(HARVEST_REPORT) --top-n 20

bench-harvest-all:
	$(MAKE) bench-harvest HARVEST_INPUT=$(BENCH_ROOT)/corpus HARVEST_OUT=$(BENCH_ROOT)/reports/harvest/corpus-signals.json HARVEST_REPORT=$(BENCH_ROOT)/reports/harvest/corpus-report.md HARVEST_PROGRESS=$(BENCH_ROOT)/reports/harvest/corpus-progress.jsonl
	$(MAKE) bench-harvest HARVEST_INPUT=$(BENCH_ROOT)/decks HARVEST_OUT=$(BENCH_ROOT)/reports/harvest/decks-signals.json HARVEST_REPORT=$(BENCH_ROOT)/reports/harvest/decks-report.md HARVEST_PROGRESS=$(BENCH_ROOT)/reports/harvest/decks-progress.jsonl
	$(MAKE) bench-mechanisms

bench-mechanisms:
	$(UV_RUN) python $(BENCH_ROOT)/scripts/plan_mechanisms.py \
		$(BENCH_ROOT)/reports/harvest/corpus-signals.json \
		$(BENCH_ROOT)/reports/harvest/decks-signals.json \
		--output $(MECHANISMS_OUT) --report $(MECHANISMS_REPORT) --top-n 10

bench-app: bench-index-all
	$(UV_RUN) python $(BENCH_ROOT)/scripts/serve_app.py --port $(PORT)

bench-run:
	$(UV_RUN) python $(BENCH_ROOT)/run.py

bench-run-strict:
	$(UV_RUN) python $(BENCH_ROOT)/run.py --strict

bench-build: bench-render-all

clean-env:
	rm -rf .venv .uv-cache .ms-playwright

# ----------------------------------------------------------------------
# Bun monorepo (apps/web, apps/daemon, packages/*) — derived from OD
# (nexu-io/open-design, Apache 2.0; see THIRD_PARTY_NOTICES.md).
# ----------------------------------------------------------------------

bun-install:
	bun install

web:
	bun run web

daemon:
	bun run daemon

web-build:
	bun run --filter @pixelpitch/web build

daemon-build:
	bun run --filter @pixelpitch/daemon build

skills-sync:
	bun run skills:sync

skills-verify:
	bun run skills:verify

smoke:
	bun run smoke

# Friendly aliases — shorter than `bun run X`.
up: dev

dev:
	bun run dev

stop:
	bun run stop

status:
	bun run status

logs:
	bun run logs

doctor-web:
	bun run doctor

pixelpitch-bootstrap:
	bun run bootstrap

# ----------------------------------------------------------------------
# Slidify evolution loop — harvest the deck skills as a corpus, rank
# what slidify currently rasterizes, drive the promotion roadmap.
# See docs/slidify-evolution.md.
# ----------------------------------------------------------------------

build-skills-corpus:
	$(UV_RUN) python $(BENCH_ROOT)/scripts/build_skills_corpus.py

harvest-deck-skills: build-skills-corpus
	SLIDIFY_LOG_LEVEL=warning $(UV_RUN) slidify harvest $(BENCH_ROOT)/decks-from-skills \
		--output $(BENCH_ROOT)/reports/harvest/skills-signals.json --top-n 80 --min-occurrences 1 \
		--progress plain --progress-file $(BENCH_ROOT)/reports/harvest/skills-progress.jsonl
	$(PYTHON) $(BENCH_ROOT)/scripts/summarize_harvest.py $(BENCH_ROOT)/reports/harvest/skills-signals.json \
		--output $(BENCH_ROOT)/reports/harvest/skills-report.md --top-n 30
	@echo ""
	@echo "Harvest done. Inspect:"
	@echo "  cat $(BENCH_ROOT)/reports/harvest/skills-report.md"
	@echo "  slidify field $(BENCH_ROOT)/reports/harvest/skills-signals.json promotions"
