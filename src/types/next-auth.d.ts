// Campos extras que o Rewind guarda na sessão do NextAuth (ver src/lib/auth.ts).
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** Token JWT do backend; ausente quando a sessão expirou. */
    accessToken?: string;
    error?: "SessionExpired";
    user: DefaultSession["user"] & {
      id: string;
      username: string;
    };
  }

  interface User {
    username: string;
    accessToken: string;
    /** Timestamp (ms) em que o token do backend expira. */
    accessTokenExpires: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    accessToken?: string;
    accessTokenExpires?: number;
    error?: "SessionExpired";
  }
}