// Narrow structural view of the Prisma client: only what the services use.
// Lets services be unit-tested with an in-memory fake (tests/mocks/db.ts).

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  pan: string | null;
}
export interface DocumentRow {
  id: string;
  userId: string;
  kind: string;
  fileName: string;
  data: Uint8Array;
  iv: string;
  authTag: string;
  createdAt: Date;
}
export interface ReturnRow {
  id: string;
  userId: string;
  status: string;
  income: unknown;
  computation: unknown;
  ackNumber: string | null;
  submittedAt: Date | null;
}
export interface ApprovalRow {
  id: string;
  userId: string;
  step: string;
  payload: unknown;
  approved: boolean | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface Db {
  user: {
    findUnique(args: { where: { id: string } }): Promise<UserRow | null>;
  };
  document: {
    findMany(args: {
      where: { userId: string };
      orderBy?: { createdAt: "asc" | "desc" };
    }): Promise<DocumentRow[]>;
    findFirst(args: {
      where: { id: string; userId: string };
    }): Promise<DocumentRow | null>;
    create(args: {
      data: {
        userId: string;
        kind: string;
        fileName: string;
        data: Uint8Array;
        iv: string;
        authTag: string;
      };
    }): Promise<DocumentRow>;
  };
  return: {
    create(args: {
      data: {
        userId: string;
        status: string;
        income: unknown;
        computation: unknown;
      };
    }): Promise<ReturnRow>;
    update(args: {
      where: { id: string };
      data: Partial<{ status: string; ackNumber: string; submittedAt: Date }>;
    }): Promise<ReturnRow>;
  };
  approval: {
    create(args: {
      data: { userId: string; step: string; payload: unknown };
    }): Promise<ApprovalRow>;
    findUnique(args: { where: { id: string } }): Promise<ApprovalRow | null>;
    findMany(args: {
      where: { userId: string; approved: null };
      orderBy: { createdAt: "asc" };
    }): Promise<ApprovalRow[]>;
    updateMany(args: {
      where: { id: string; userId: string; approved: null };
      data: { approved: boolean; resolvedAt: Date };
    }): Promise<{ count: number }>;
  };
}
