import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ApiError, apiPost } from "@/lib/api/client";

/** Resposta de POST /users/login no backend. */
interface LoginResponse {
  token: string;
  /** Data ISO em que o token do backend expira. */
  expiresAt: string;
  user: { id: string; name: string; username: string; email: string; avatarUrl: string | null };
}

/** Prazo máximo da sessão: igual ao do token com "lembrar conta" (30 dias). */
const MAX_SESSION_SECONDS = 30 * 24 * 60 * 60;

// O login de verdade acontece no backend (JWT próprio). O NextAuth só guarda
// o token devolvido na sessão (cookie criptografado) para o front usar nas chamadas.
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        rememberMe: { label: "Manter conectado", type: "checkbox" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        try {
          const { token, expiresAt, user } = await apiPost<LoginResponse>("/users/login", {
            email: credentials.email,
            password: credentials.password,
            rememberMe: credentials.rememberMe === "true",
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatarUrl,
            username: user.username,
            accessToken: token,
            accessTokenExpires: Date.parse(expiresAt),
          };
        } catch (error) {
          // E-mail ou senha errados: o signIn devolve error = "CredentialsSignin".
          if (error instanceof ApiError && (error.code === "UNAUTHORIZED" || error.code === "VALIDATION_ERROR")) {
            return null;
          }
          // Backend fora do ar ou erro inesperado: o signIn devolve esta mensagem em error.
          throw new Error("SERVER_UNAVAILABLE");
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: MAX_SESSION_SECONDS },
  callbacks: {
    async jwt({ token, user }) {
      // `user` só vem no momento do login.
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.accessToken = user.accessToken;
        token.accessTokenExpires = user.accessTokenExpires;
        delete token.error;
      }

      // Sem "lembrar conta" o token do backend vale 1 dia: depois disso a sessão é marcada
      // como expirada e o token deixa de ser usado (o SessionWatcher faz o logout).
      if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
        delete token.accessToken;
        token.error = "SessionExpired";
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.username = token.username ?? "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};