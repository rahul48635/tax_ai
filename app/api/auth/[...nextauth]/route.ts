import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "email", type: "text", placeholder: "username" },
        password: { label: "password", type: "text", placeholder: "password" },
      },
      authorize: async (credentials) => {
        let user = null;
        try {
          user = await db.orm.public.User.whereUnique({
            email: credentials?.username as string,
          }).first();
        } catch (e) {
          throw new Error(e instanceof Error ? e.message : String(e));
        } finally {
          await db.close();
        }
        if (user) {
          // Convert id to string to match NextAuth User type
          return {
            ...user,
            id: user.id.toString(),
          };
        }
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID ?? "",
      clientSecret: process.env.GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn(params: {
      user: import("next-auth").User | import("next-auth/adapters").AdapterUser;
      account: import("next-auth").Account | null;
      profile?: import("next-auth").Profile;
      email?: { verificationRequest?: boolean };
      credentials?: Record<string, unknown>;
    }) {
      const { user, account } = params;

      try {
        // Only store Google users (you can check provider here)
        if (account && account.provider === "google") {
          const existingUser = await db.orm.public.User.where({
            email: user.email ?? " ",
          }).first(); // returns null if no match

          if (!existingUser) {
            await db.orm.public.User.create({
              email: user.email ?? "",
              username: user.name ?? user.email ?? "",
            });
          }
        }

        return true;
      } catch (error) {
        console.error("Sign-in error:", error);
        return false;
      } finally {
        await db.close();
      }
    },
  },

  pages: {
    signIn: "/signin",
  },
};

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
