import { apiCtx } from "@/lib/api/ctx";
import { startFiling } from "@/lib/api/handlers";

export const maxDuration = 300; // the run waits on human approvals; needs a long-lived Node server

export const POST = (req: Request) => startFiling(req, apiCtx);
