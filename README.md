# Pipe Dreams Plumbing - MCP Demo

This is a full-stack Next.js application demonstrating a Model Context Protocol (MCP) integration. It serves as a mock customer portal for "Pipe Dreams Plumbing", where an AI assistant can manage support tickets, schedule appointments, query users, and retrieve newsletter content using an integrated SQLite database.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: SQLite (via `better-sqlite3`)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: Tailwind CSS & Shadcn UI
- **AI Integration**: `@modelcontextprotocol/sdk` and `@google/generative-ai`

## Getting Started

Follow these instructions to set up and run the project locally.

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root of the project by copying the example:

```bash
cp .env.example .env
```

Open `.env` and add your LLM Provider API key. By default, the application is set up to use Google's Gemini, but you can also configure it to use OpenAI:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Seed the Database

The application uses an SQLite database stored in the `data/` directory. To create the tables and populate them with initial mock data (users, tickets, appointments, and newsletters), run the seed script:

```bash
npx tsx src/db/seed.ts
```

### 4. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available MCP Tools

The AI assistant in this project has access to several backend tools defined in `src/mcp-server/index.ts`:

- `query_tickets`: List and filter support tickets. Returns tickets for a user or all tickets (admin).
- `get_ticket_detail`: Get detailed information about a specific ticket by ID.
- `create_ticket`: Create a new support ticket for a plumbing issue.
- `query_appointments`: List scheduled appointments. Returns user's appointments or all (admin).
- `schedule_appointment`: Book a new plumbing service appointment.
- `get_newsletter`: Fetch newsletter content, tips, FAQs, and promotions.
- `manage_users`: List or get details about system users.
- `get_newsletter_advice`: Queries the SQLite database for plumbing tips/articles from the newsletter to provide expert context in chat.
- `create_service_ticket`: Takes user problem description, urgency level, and contact info to create a row in the tickets table.
- `check_plumber_availability`: Checks the appointments table for open time slots on a given date.
- `generate_business_metrics`: (Admin Only) Returns a JSON object of ticket statuses (Open vs. Closed) formatted for a Shadcn/Recharts graph.
- `summarize_ticket_problems`: (Admin Only) Aggregates open tickets, groups by problem type, returns structured summary.
- `suggest_ticket_response`: (Admin Only) Takes a ticket subject and generates a suggested operator response.

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components (including Shadcn UI components).
- `src/db`: Drizzle ORM schema, setup, and seed scripts.
- `src/mcp-server`: Model Context Protocol implementation, defining the tools the AI can use.
- `src/context`: React Context providers for managing application state (e.g., chat context).

## Development Notes

Modifying the database schema? Make sure to update `src/db/schema.ts` and use `drizzle-kit` to manage migrations. If you just want to reset the mock data, you can re-run the seed script.
