FROM cypress/included:13.13.1

# Install Postgres client tools for pg_dump / pg_restore
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress
