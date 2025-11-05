# JackStack

An extremely opinionated starter stack for building full-stack applications the Jack way.

## Stack

- React
- Node.js (Express)
- PostgreSQL
- Prisma
- Postmark
- Jest
- Supertest
- ESLint
- Prettier
- Docker

## Features

#### Basics

- React
- Node.js
- PostgreSQL
- Prisma

#### Code Quality

- ESLint
- Vitest
- Supertest
- Codecov
- Cypress E2E (Dockerized)

#### Ops

- Docker
- GitHub Actions

### Third Party Integrations

- Postmark Email Delivery
- ip-api.com IP Geolocation
- React Email[^1]

## Getting Started

1. Clone the repo and delete the `.git` folder

```bash
git clone https://github.com/jackcrane/jack-stack.git your-project-name
cd your-project-name
rm -rf .git
git init
```

2. Create the `.env` file

```bash
cp .env.example .env
```

```bash
DATABASE_URL="postgresql://..." # Your PostgreSQL connection string
POSTMARK_API_TOKEN="..." # Your Postmark API token. You can get this from the Postmark dashboard. It looks like a uuid.
JWT_SECRET="..." # A random string.
```

3. Install dependencies

```bash
cd api && yarn install
cd ..
cd app && yarn install
```

4. Start the server

```bash
cd api && yarn start
```

## End-to-End Tests

See `docs/e2e-testing.md` for the Cypress + Docker based E2E harness and database seeding workflow.

```bash
cd api && yarn dev
```

5. Start the frontend

```bash
cd app && yarn start
```

6. Replace terminology with your own

> Across the app replace `EventPilot` with your own project name, and change the `instructor`, `dispatcher`, and `manager` roles to your own terminology in the `verifyAuth` function in `api/util/verifyAuth.js` and in the db schema.

7. Open the app in your browser

> Visit [http://localhost:5173](http://localhost:5173) to view the app. The server is running on 3000 but unless you are testing an API endpoint, you should not need to use it.

> [!WARNING]
> **Stay away from the migrations folder**: When doing codebase-wide find and replace, be sure to exclude the `migrations` folder from your search.


## Testing

This project uses Vitest for testing on the backend. Tests are available via

```bash
yarn test
```

```bash
yarn coverage
```

Typical vitest arguments can be passed to the above commands (e.g. `yarn coverage --ui`).

Frontend tests are not currently available.

Test files are colocated with their respective route files inside of a `test` folder and named `*.test.js`.

[^1]: NOTE: React Email is ~sort of~ supported, but is not really and requires some manual work after the inital setup. The workflow is: (1) Write the email in React, (2) `yarn email:export`, (3) change the extension from `html` to `hbs`, (4) copy the new email template into the `react-email/complete` folder. To prevent having to redo work, instead of using typical React templating, include variables (in this case `name`) as follows: `{"{{name}}"}`.

## Services

### Email

This project uses Postmark for email delivery. See above for instructions on how to set up Postmark.

### Geolocation

This project uses ip-api.com for geolocation. See above for instructions on how to set up ip-api.com.

### File Uploads

This project uses multer for file uploads. Be sure to set up S3 credentials in `.env`. From there, the `upload` middleware in `api/util/file.js` can be used to upload files to S3. It can be implemented in a route like so:

```js
import { upload } from "#file";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const post = [
  verifyAuth(["manager"]),
  upload,
  async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({ message: "File uploaded successfully", url: file.location });
  },
];
```
