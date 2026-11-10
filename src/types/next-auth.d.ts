import "next-auth";
import "next-auth/jwt";

// Campos que o route.ts do NextAuth guarda na sessão a partir do login do backend.

declare module "next-auth" {
  interface User {
    username: string;
    accessToken: string;
  }

  interface Session {
    /** Token do backend, para as rotas com authMiddleware. */
    accessToken: string;
    user: {
      id: string;
      username: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    username: string;
    accessToken: string;
  }
}
