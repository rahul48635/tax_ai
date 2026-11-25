import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import SignInForm from "@/components/Signinform";

async function getUser() {
  const session = await getServerSession();
  return session;
}

export default async function SignInPage() {
  const session = await getUser();
  if (session) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
