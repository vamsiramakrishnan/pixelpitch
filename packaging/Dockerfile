# slidify — production runtime image.
#
# Multi-stage:
#   1. `builder` installs Python + Playwright + project, builds a wheel.
#   2. `runtime` copies the wheel into a slim image with system deps
#      (LibreOffice, Tesseract, poppler-utils, Inter font, Chromium).
#
# Build:
#     docker build -f packaging/Dockerfile -t slidify:latest .
#
# Run:
#     docker run --rm -v "$PWD":/work slidify:latest \
#            convert /work/deck.html /work/out.pptx --json
#
# Verify:
#     docker run --rm slidify:latest doctor

ARG PYTHON_VERSION=3.11

# ----------------------------------------------------------------------------
# Stage 1 — builder
# ----------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /build

# Build deps (lxml, pillow native bits).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libxml2-dev libxslt1-dev zlib1g-dev libjpeg-dev \
        curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv (fast resolver) — keeps the image deterministic relative
# to the lockfile.
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    cp /root/.local/bin/uv /usr/local/bin/uv

COPY pyproject.toml uv.lock README.md LICENSE ./
COPY slidify/ ./slidify/

RUN uv build --wheel --out-dir /wheels

# ----------------------------------------------------------------------------
# Stage 2 — runtime
# ----------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    DEBIAN_FRONTEND=noninteractive

# System runtime deps:
#   * libreoffice-impress  — fidelity oracle (PPTX → PNG)
#   * tesseract-ocr        — OCR recall checks
#   * poppler-utils        — pdftoppm fallback path
#   * fonts-inter          — default deck typeface
#   * fonts-liberation,
#     fonts-dejavu-core    — sensible substitutes for missing CSS families
#   * libnss3, libxkbcommon0,
#     libgbm1, libasound2,
#     libpango-1.0-0,
#     libcairo2, libxcomposite1,
#     libxdamage1, libxfixes3,
#     libxrandr2, libxshmfence1,
#     libdrm2, libxext6, libxi6  — Chromium runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        libreoffice-impress libreoffice-core \
        tesseract-ocr \
        poppler-utils \
        fonts-inter fonts-liberation fonts-dejavu-core \
        libnss3 libxkbcommon0 libgbm1 libasound2 \
        libpango-1.0-0 libcairo2 libxcomposite1 libxdamage1 \
        libxfixes3 libxrandr2 libxshmfence1 libdrm2 libxext6 libxi6 \
        libatk1.0-0 libatk-bridge2.0-0 libcups2 libxss1 \
        ca-certificates \
    && fc-cache -f \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Install the slidify wheel from stage 1.
COPY --from=builder /wheels/*.whl /tmp/
RUN pip install --no-cache-dir /tmp/*.whl && rm /tmp/*.whl

# Pre-install Playwright Chromium to a stable path so doctor finds it.
RUN python -m playwright install chromium

# Non-root user — LibreOffice writes a profile dir, so we give it $HOME.
RUN useradd --create-home --shell /bin/bash slidify
USER slidify
WORKDIR /work

# Default command: forward args to slidify.
ENTRYPOINT ["slidify"]
CMD ["--help"]
