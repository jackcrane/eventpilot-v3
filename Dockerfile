# Base image for frontend and backend
FROM node:20-alpine AS base

# Accept build-time arguments
ARG DATABASE_URL
ARG SENTRY_AUTH_TOKEN

# Set the working directory to /app for the frontend
WORKDIR /app

# Copy app directory contents to /app
COPY ./app/ ./

# Install dependencies for the frontend
RUN yarn install

# Make sure NODE_ENV is set to production
ENV NODE_ENV=production

# Build the frontend
RUN yarn build

WORKDIR /api/react-email

COPY ./api/react-email/ ./

RUN yarn install

# Set the working directory to /api for the backend
WORKDIR /api

# Copy api directory contents to /api
COPY ./api/ ./

# Install dependencies for the backend
RUN yarn install

# Build Prisma (assumes you have a Prisma setup)
RUN npx prisma generate
RUN npx prisma migrate deploy

# Expose the required port for the backend
EXPOSE 3000

# Ensure environment variables are injected at runtime (no .env embedded)
CMD ["yarn", "start"]