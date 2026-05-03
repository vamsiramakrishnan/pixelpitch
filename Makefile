SHELL := /bin/bash

UV ?= uv
PYTHON ?= python
DECK ?= image-led-magazine
TAG ?= raster-rich
HARVEST_OUT ?= _bench/reports/harvest/bench-signals.json
HARVEST_REPORT ?= _bench/reports/harvest/bench-report.md
HARVEST_INPUT ?= _bench/corpus
HARVEST_PROGRESS ?= _bench/reports/harvest/bench-progress.jsonl
HARVEST_PROGRESS_MODE ?= plain
MECHANISMS_OUT ?= _bench/reports/harvest/mechanisms.json
MECHANISMS_REPORT ?= _bench/reports/harvest/mechanisms.md
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
	web daemon web-build daemon-build skills-sync skills-verify smoke bun-install

help:
	@echo "Environment"
	@echo "  make sync                 Install locked dependencies into .venv using .uv-cache"
	@echo "  make bootstrap            sync + install Chromium for Playwright"
	@echo "  make playwright-deps      Install Chromium plus OS libraries via Playwright"
	@echo "  make doctor               Check external runtime dependencies"
	@echo "  make clean-env            Remove .venv, .uv-cache, and .ms-playwright"
	@echo ""
	@echo "Checks"
	@echo "  make lint                 Ruff check"
	@echo "  make test                 Pytest"
	@echo "  make check                lint + test"
	@echo ""
	@echo "Bench"
	@echo "  make bench-index          Rebuild _bench/corpus/index.{json,html}"
	@echo "  make bench-index-all      Rebuild _bench/index.{json,html}"
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
# Run this after `npm install --prefix tools/pattern-gen tailwindcss@latest`
# bumps to a new major.
patterns:
	cd tools/pattern-gen && node extract-tailwind.js > ../../slidify/patterns/data/tailwind.json
	@echo "Wrote slidify/patterns/data/tailwind.json"
	@python3 -c "import json; d = json.load(open('slidify/patterns/data/tailwind.json')); print(f\"  version={d['version']}  colors={len(d['colors'])}  radii={len(d['border_radius'])}  shadows={len(d['shadow'])}  sizes={len(d['font_size'])}  spacing={len(d['spacing_px'])}\")"

test:
	$(UV_RUN) pytest -q

lint:
	$(UV_RUN) ruff check slidify tests

check: lint test

bench-index:
	$(PYTHON) _bench/scripts/build_corpus_index.py

bench-index-all: bench-index
	$(PYTHON) _bench/scripts/build_bench_index.py

bench-compose: bench-index-all
	$(PYTHON) _bench/scripts/compose_corpus.py --deck $(DECK) --force

bench-compose-tag: bench-index-all
	$(PYTHON) _bench/scripts/compose_corpus.py --tag $(TAG) --name $(TAG) --force

bench-render: bench-compose
	$(UV_RUN) slidify convert _bench/generated/composed/$(DECK) _bench/generated/dist/$(DECK).pptx \
		--no-tier3 --no-oracle --quiet

bench-render-tag: bench-compose-tag
	$(UV_RUN) slidify convert _bench/generated/composed/$(TAG) _bench/generated/dist/$(TAG).pptx \
		--no-tier3 --no-oracle --quiet

bench-render-all: bench-index-all
	$(UV_RUN) python _bench/build.py --skip-generate

bench-harvest: bench-index-all
	SLIDIFY_LOG_LEVEL=warning $(UV_RUN) slidify harvest $(HARVEST_INPUT) --output $(HARVEST_OUT) --top-n 80 --min-occurrences 2 \
		--progress $(HARVEST_PROGRESS_MODE) --progress-file $(HARVEST_PROGRESS)
	$(PYTHON) _bench/scripts/summarize_harvest.py $(HARVEST_OUT) --output $(HARVEST_REPORT) --top-n 20

bench-harvest-all:
	$(MAKE) bench-harvest HARVEST_INPUT=_bench/corpus HARVEST_OUT=_bench/reports/harvest/corpus-signals.json HARVEST_REPORT=_bench/reports/harvest/corpus-report.md HARVEST_PROGRESS=_bench/reports/harvest/corpus-progress.jsonl
	$(MAKE) bench-harvest HARVEST_INPUT=_bench/decks HARVEST_OUT=_bench/reports/harvest/decks-signals.json HARVEST_REPORT=_bench/reports/harvest/decks-report.md HARVEST_PROGRESS=_bench/reports/harvest/decks-progress.jsonl
	$(MAKE) bench-mechanisms

bench-mechanisms:
	$(UV_RUN) python _bench/scripts/plan_mechanisms.py \
		_bench/reports/harvest/corpus-signals.json \
		_bench/reports/harvest/decks-signals.json \
		--output $(MECHANISMS_OUT) --report $(MECHANISMS_REPORT) --top-n 10

bench-app: bench-index-all
	$(UV_RUN) python _bench/scripts/serve_app.py --port $(PORT)

bench-run:
	$(UV_RUN) python _bench/run.py

bench-run-strict:
	$(UV_RUN) python _bench/run.py --strict

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

