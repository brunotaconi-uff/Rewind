import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_URL } from "@/lib/api/client";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatarUrl: string | null;
  };
}

// O token do backend dura 1 dia (POST /users/login sem rememberMe);
// a sessão do NextAuth acompanha para não ficar logada com token vencido.
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const response = await fetch(`${API_URL}/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });
        // 401 = credenciais inválidas; a tela de login mostra a mensagem.
        if (!response.ok) return null;

        const { token, user } = (await response.json()) as LoginResponse;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          username: user.username,
          accessToken: token,
        };
      },
    }),
  ],
  session: { maxAge: SESSION_MAX_AGE_SECONDS },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.username = user.username;
        token.accessToken = user.accessToken;
      }
      // Depois de editar o perfil, o front chama update() para a topbar e o
      // dono do perfil continuarem certos sem precisar logar de novo.
      if (trigger === "update" && session) {
        if (typeof session.username === "string") token.username = session.username;
        if (typeof session.name === "string") token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.userId;
      session.user.username = token.username;
      session.user.name = token.name;
      session.user.image = token.picture;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
