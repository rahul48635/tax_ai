"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reduceMotion = useReducedMotion();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError ? "Sign-in failed. Try again, or use a different method." : null,
  );
  const [errorKey, setErrorKey] = useState(0); // re-triggers the shake on repeat errors
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function showError(message: string) {
    setError(message);
    setErrorKey((k) => k + 1);
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      showError("Email or password is incorrect.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 " +
    "placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1.5 mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Use your email and password, or continue with Google.
      </p>

      <motion.button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        className="flex w-full items-center justify-center gap-2.5 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-base font-medium text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"
          />
          <path
            fill="#FBBC05"
            d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
          />
        </svg>
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </motion.button>

      <div
        className="my-6 flex items-center gap-3 text-sm text-slate-500"
        role="separator"
      >
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        or
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <form onSubmit={handleCredentials} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={errorKey}
              role="alert"
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={
                reduceMotion
                  ? { opacity: 1, height: "auto" }
                  : { opacity: 1, height: "auto", x: [0, -6, 6, -4, 4, 0] }
              }
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={loading || !email || !password}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </motion.button>
      </form>
    </motion.div>
  );
}
