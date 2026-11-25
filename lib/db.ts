import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";

import type { Contract } from "@/src/prisma/contract";
import contractJson from "@/src/prisma/contract.json" with { type: "json" };

const contract = contractFromJson<Contract>(contractJson);
export const db = postgres({
  contract,
  url: process.env.DATABASE_URL!,
});
