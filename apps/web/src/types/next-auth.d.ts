import type { Role } from "@base-ecommerce/domain";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      emailVerified: boolean;
      sid?: string;
      authenticatedAt?: string;
    } & NonNullable<Session["user"]>;
  }

  interface User {
    role?: Role;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    emailVerified?: boolean;
    sid?: string;
    authenticatedAt?: string;
  }
}
