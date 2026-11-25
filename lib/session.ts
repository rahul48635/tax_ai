// Single place that answers "who is calling?". Swap the body for NextAuth's `auth()`
// once auth is wired, e.g.:  const session = await auth(); return session?.user?.id ?? null;
//
// Until then: production always returns null (every request is 401), and outside production an
// `x-user-id` header is accepted so the API and review page can be exercised locally.
export async function getUserId(req: Request): Promise<string | null> {
  if (process.env.NODE_ENV === "production") return null;
  return req.headers.get("x-user-id");
}
