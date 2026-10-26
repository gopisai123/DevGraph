# DevGraph

Neo4j-backed developer, repository, skill, and topic exploration with a React/Vite interface.

## Run

1. Start Neo4j Desktop, then configure `.env` from `.env.example` (`bolt://localhost:7687` is typical).
2. Install dependencies: `npm install` and `cd frontend; npm install`.
3. Create and seed the graph: `npm run schema` then `npm run seed`.
4. In separate terminals, run `npm run dev` and `cd frontend; npm run dev`.

Open the Vite URL (normally `http://localhost:5173`). The frontend proxies API calls to port 3000.

Optional AI configuration stays server-side: set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and `AI_MODEL` in `.env`. Core graph features do not need an AI key.
