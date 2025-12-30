# MaxMin DTC Analytics Maturity Assessment

## Project Overview

The MaxMin DTC Analytics Maturity Assessment is a 24-question quiz that evaluates organizations across 6 dimensions, producing a maturity score (1-5), personalized roadmap, and downloadable PDF report.

## Features

- **24-Question Quiz:** Evaluates organizations across 6 key dimensions of analytics maturity.
- **Maturity Score:** Calculates a score from 1-5 based on the user's answers.
- **Personalized Roadmap:** Provides a customized roadmap with actionable steps for improvement.
- **Downloadable PDF Report:** Generates a shareable PDF report of the assessment results.
- **Email Gate:** Captures user information before displaying the results.
- **Server-Side Scoring:** Ensures a single source of truth for scoring logic.
- **Unique Results Page:** Provides a unique, shareable URL for each assessment.
- **Cached PDF Generation:** Caches generated PDFs for 24 hours to improve performance.

## Technology Stack

- **Framework:** [Next.js](https://nextjs.org/)
- **Database:** [Supabase](https://supabase.io/) (PostgreSQL)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **PDF Generation:** [pdf-lib](https://pdf-lib.js.org/)
- **Email:** [Resend](https://resend.com/)
- **Testing:** [Vitest](https://vitest.dev/)
- **Linting & Formatting:** [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/maxmin-dtc-assessment.git
   cd maxmin-dtc-assessment
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up environment variables:**

   Copy the example environment file:

   ```bash
   cp .env.local.example .env.local
   ```

   Update the `.env.local` file with your Supabase credentials and other settings.

4. **Run the setup script:**

   This script will start the local Supabase instance, apply database migrations, and seed the database with initial data.

   ```bash
   pnpm setup
   ```

5. **Start the development server:**

   ```bash
   pnpm dev
   ```

   The application should now be running at [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
| :--- | :--- |
| `pnpm dev` | Starts the development server. |
| `pnpm build` | Builds the application for production. |
| `pnpm start` | Starts a production server. |
| `pnpm lint` | Lints the codebase using ESLint. |
| `pnpm format` | Checks for formatting issues with Prettier. |
| `pnpm format:write` | Formats the codebase with Prettier. |
| `pnpm test` | Runs the test suite with Vitest. |
| `pnpm test:watch` | Runs the test suite in watch mode. |
| `pnpm db:start` | Starts the local Supabase instance. |
| `pnpm db:stop` | Stops the local Supabase instance. |
| `pnpm db:reset` | Resets the local Supabase database. |
| `pnpm db:seed` | Seeds the database with initial data. |
| `pnpm setup` | A utility script that runs `db:start`, `db:reset`, and `db:seed` in sequence. |

## Project Structure

A brief overview of the most important directories in the project:

```
.
├── app/                  # Next.js App Router: contains all routes and API endpoints
├── components/           # Shared React components
├── config/               # Static configuration files (questions, dimensions, etc.)
├── docs/                 # Project documentation
├── lib/                  # Core application logic, helpers, and utilities
├── scripts/              # Standalone scripts (e.g., database seeding)
├── supabase/             # Supabase configuration and database migrations
└── types/                # TypeScript type definitions
```

## Further Documentation

For more in-depth information, please refer to the documents in the [`docs`](./docs) directory:

- **[Assessment System](./docs/assessment-system.md):** A detailed breakdown of the quiz flow, scoring system, and data structures.
- **[Launch Checklist](./docs/launch-checklist.md):** The checklist for deploying the application to production.
- **[QA Checklist](./docs/qa-checklist.md):** A comprehensive list of test cases for quality assurance.
- **[Runbook](./docs/runbook.md):** A guide for troubleshooting common issues and monitoring the application.
