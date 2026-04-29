.PHONY: patterns test lint check

# Regenerate the Tailwind catalog from the latest tailwindcss npm package.
# Run this after `npm install --prefix tools/pattern-gen tailwindcss@latest`
# bumps to a new major.
patterns:
	cd tools/pattern-gen && node extract-tailwind.js > ../../slidify/patterns/data/tailwind.json
	@echo "Wrote slidify/patterns/data/tailwind.json"
	@python3 -c "import json; d = json.load(open('slidify/patterns/data/tailwind.json')); print(f\"  version={d['version']}  colors={len(d['colors'])}  radii={len(d['border_radius'])}  shadows={len(d['shadow'])}  sizes={len(d['font_size'])}  spacing={len(d['spacing_px'])}\")"

test:
	uv run pytest -q

lint:
	uv run ruff check slidify tests

check: lint test
