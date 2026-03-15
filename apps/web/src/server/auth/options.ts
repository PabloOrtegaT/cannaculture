import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { roleSchema } from "@base-ecommerce/domain";
import { getRuntimeEnvironment } from "@/server/config/runtime-env";
import { getDb } from "@/server/db/client";
import { accountsTable, usersTable, verificationTokensTable } from "@/server/db/schema";
import { getAccessTokenWindowSeconds } from "./refresh-session-policy";
import { createRefreshSession, getActiveRefreshSessionById } from "./refresh-sessions";
import { validateCredentials } from "./service";

export function getAuthOptions(): NextAuthOptions {
  const env = getRuntimeEnvironment();
  const db = getDb();

  const providers: NonNullable<NextAuthOptions["providers"]> = [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await validateCredentials(credentials.email, credentials.password);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ];

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
    providers.push(
      FacebookProvider({
        clientId: env.FACEBOOK_CLIENT_ID,
        clientSecret: env.FACEBOOK_CLIENT_SECRET,
      }),
    );
  }

  const options: NextAuthOptions = {
    adapter: DrizzleAdapter(db, {
      usersTable,
      accountsTable,
      verificationTokensTable,
    }),
    providers,
    session: {
      strategy: "jwt",
      maxAge: getAccessTokenWindowSeconds(),
    },
    jwt: {
      maxAge: getAccessTokenWindowSeconds(),
    },
    pages: {
      signIn: "/login",
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          const created = await createRefreshSession(user.id, "storefront", {});
          token.role = roleSchema.parse((user as { role?: string | undefined }).role ?? "catalog");
          token.emailVerified = Boolean((user as { emailVerified?: boolean | undefined }).emailVerified);
          token.sid = created.session.id;
          token.authenticatedAt = created.session.createdAt.toISOString();
          return token;
        }

        if (typeof token.sub === "string" && typeof token.sid === "string") {
          const active = await getActiveRefreshSessionById(token.sid);
          if (!active || active.userId !== token.sub) {
            delete token.sid;
            delete token.authenticatedAt;
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = typeof token.sub === "string" ? token.sub : "";
          session.user.role = roleSchema.parse(
            typeof (token as { role?: unknown }).role === "string" ? (token as { role: string }).role : "catalog",
          );
          session.user.emailVerified = Boolean((token as { emailVerified?: unknown }).emailVerified);
          if (typeof token.sid === "string") {
            session.user.sid = token.sid;
          }
          if (typeof token.authenticatedAt === "string") {
            session.user.authenticatedAt = token.authenticatedAt;
          }
        }
        return session;
      },
      async signIn({ user, account }) {
        if (!account || account.provider !== "credentials") {
          return true;
        }
        return Boolean((user as { emailVerified?: boolean | undefined }).emailVerified);
      },
    },
  };

  if (env.AUTH_SECRET) {
    options.secret = env.AUTH_SECRET;
  }

  return options;
}
