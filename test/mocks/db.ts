import type {
  ApprovalRow,
  Db,
  DocumentRow,
  ReturnRow,
  UserRow,
} from "../../lib/db-types";

/** In-memory Db for unit tests. `tables` is exposed so tests can inspect or mutate state. */
export function createFakeDb(users: UserRow[] = []) {
  const tables = {
    users: [...users],
    documents: [] as DocumentRow[],
    returns: [] as ReturnRow[],
    approvals: [] as ApprovalRow[],
  };
  let n = 0;
  const id = (p: string) => `${p}_${++n}`;

  const db: Db = {
    user: {
      findUnique: async ({ where }) =>
        tables.users.find((u) => u.id === where.id) ?? null,
    },
    document: {
      findMany: async ({ where }) =>
        tables.documents.filter((d) => d.userId === where.userId),
      findFirst: async ({ where }) =>
        tables.documents.find(
          (d) => d.id === where.id && d.userId === where.userId,
        ) ?? null,
      create: async ({ data }) => {
        const row = { id: id("doc"), createdAt: new Date(), ...data };
        tables.documents.push(row);
        return row;
      },
    },
    return: {
      create: async ({ data }) => {
        const row: ReturnRow = {
          id: id("ret"),
          ackNumber: null,
          submittedAt: null,
          ...data,
        };
        tables.returns.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = tables.returns.find((r) => r.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      },
    },
    approval: {
      create: async ({ data }) => {
        const row: ApprovalRow = {
          id: id("apr"),
          approved: null,
          createdAt: new Date(),
          resolvedAt: null,
          ...data,
        };
        tables.approvals.push(row);
        return row;
      },
      findUnique: async ({ where }) =>
        tables.approvals.find((a) => a.id === where.id) ?? null,
      findMany: async ({ where }) =>
        tables.approvals.filter(
          (a) => a.userId === where.userId && a.approved === null,
        ),
      updateMany: async ({ where, data }) => {
        const hits = tables.approvals.filter(
          (a) =>
            a.id === where.id &&
            a.userId === where.userId &&
            a.approved === null,
        );
        hits.forEach((a) => Object.assign(a, data));
        return { count: hits.length };
      },
    },
  };
  return { db, tables };
}
