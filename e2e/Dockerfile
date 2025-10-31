FROM --platform=linux/amd64 cypress/included:13.13.1

# Install build tooling (for native node modules), Postgres client tools,
# and add Google Chrome so Cypress can run with the chrome browser.
RUN apt-get update \
  && apt-get install -y --no-install-recommends wget gnupg python3 build-essential postgresql-client \
  && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress
