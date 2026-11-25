import { apiCtx } from "@/lib/api/ctx";
import { listApprovals, resolveApproval } from "@/lib/api/handlers";

export const GET = (req: Request) => listApprovals(req, apiCtx);
export const POST = (req: Request) => resolveApproval(req, apiCtx);
