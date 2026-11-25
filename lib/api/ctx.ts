import { buildDeps } from "../container";
import { db } from "../db";
import { getUserId } from "../session";
import type { ApiCtx } from "./handlers";

export const apiCtx: ApiCtx = { db, getUserId, buildDeps };
