# Base image for frontend and backend
FROM node:20-bullseye AS base

# Accept build-time arguments
ARG DATABASE_URL
ARG SENTRY_AUTH_TOKEN
ARG VITE_PUBLIC_POSTHOG_KEY=phc_RIeSEUFcYeTWaHSKTUiwChRq6HEvG9Y7ERDI418mdsV
ARG VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Set the working directory to /app for the frontend
WORKDIR /app

# Copy app directory contents to /app
COPY ./app/ ./

# Install dependencies for the frontend
RUN yarn install --ignore-optional
RUN node -e "const { arch, platform } = process; if (platform !== 'linux') process.exit(0); const pkg = arch === 'arm64' ? '@rollup/rollup-linux-arm64-gnu' : arch === 'x64' ? '@rollup/rollup-linux-x64-gnu' : ''; if (!pkg) process.exit(0); require('child_process').execSync('yarn add -D ' + pkg, { stdio: 'inherit' });"

# Make sure NODE_ENV is set to production
ENV NODE_ENV=production
ENV VITE_PUBLIC_POSTHOG_KEY=$VITE_PUBLIC_POSTHOG_KEY
ENV VITE_PUBLIC_POSTHOG_HOST=$VITE_PUBLIC_POSTHOG_HOST

# Build the frontend
RUN yarn build

WORKDIR /api/react-email

COPY ./api/react-email/ ./

RUN yarn install --ignore-optional

# Set the working directory to /api for the backend
WORKDIR /api

# Copy api directory contents to /api
COPY ./api/ ./

# Install dependencies for the backend
RUN yarn install --ignore-optional

# Build Prisma (assumes you have a Prisma setup)
RUN npx prisma generate

# Expose the required port for the backend
EXPOSE 3000

# Ensure environment variables are injected at runtime (no .env embedded)
CMD ["yarn", "start"]
