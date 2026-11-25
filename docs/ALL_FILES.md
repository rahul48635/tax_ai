# ITR agent — file structure (all implemented)

app/
api/agent/file-return/route.ts POST: run the agent for the logged-in user
api/approvals/route.ts GET pending approvals / POST approve or reject
review/page.tsx approval UI + "Start filing"
lib/
db-types.ts narrow Db interface (what services need from Prisma)
db.ts real Prisma client (needs `prisma generate`)
crypto.ts AES-256-GCM encrypt/decrypt, key parsing
session.ts getUserId(req) — swap in NextAuth here
container.ts wires real services into AgentDeps
api/handlers.ts route logic (testable, takes a context)
api/ctx.ts real context for the routes
services/types.ts contracts for every service
services/storage.ts encrypted document storage on Postgres
services/extractor.ts Groq/LangChain structured extraction (zod-validated)
services/taxCalculator.ts old/new regime, AY 2026-27
services/returnRepository.ts returns persistence
services/itrPortal.ts ERI/gateway client: submit + e-verify
services/approval.ts DB-backed human approval gate
agent/fileReturn.ts orchestrator with approval gates
agent/graph.ts same flow as a LangGraph graph
prisma/schema.prisma User, Document, Return, Approval
prisma.config.ts Prisma 7 config
tests/
mocks/services.ts vi.fn() mocks for all services
mocks/db.ts in-memory fake Db
agent/fileReturn.test.ts runs the same cases against fileReturn and the graph
api/handlers.test.ts
crypto.test.ts
services/\*.test.ts one per service
.env.example
