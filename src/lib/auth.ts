import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_URL } from "@/lib/api/client";

interface LoginResponse {
	token: string;
	/** Data ISO em que o token do backend expira (1 dia, ou 30 com "lembrar conta"). */
	expiresAt: string;
	user: {
		id: string;
		name: string;
		username: string;
		email: string;
		avatarUrl: string | null;
	};
}

// O token do backend dura 1 dia, ou 30 com "lembrar conta". A sessão do NextAuth
// vai até o prazo maior, e o callback jwt marca a sessão como expirada quando o
// token vence (o Providers faz o logout), para não ficar logada com token vencido.
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Configuração do NextAuth, usada pela rota /api/auth e pelos server components
// que precisam da sessão (getServerSession).
export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "text" },
				password: { label: "Password", type: "password" },
				rememberMe: { label: "Manter conectado", type: "checkbox" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials.password) return null;

				let response: Response;
				try {
					response = await fetch(`${API_URL}/users/login`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							email: credentials.email,
							password: credentials.password,
							rememberMe: credentials.rememberMe === "true",
						}),
					});
				} catch {
					// Backend fora do ar: o signIn devolve esta mensagem em `error`.
					throw new Error("SERVER_UNAVAILABLE");
				}
				// 401/400 = credenciais inválidas: o signIn devolve error = "CredentialsSignin".
				if (response.status === 401 || response.status === 400) return null;
				if (!response.ok) throw new Error("SERVER_UNAVAILABLE");

				const { token, expiresAt, user } =
					(await response.json()) as LoginResponse;
				return {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.avatarUrl,
					username: user.username,
					accessToken: token,
					accessTokenExpires: Date.parse(expiresAt),
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
				token.accessTokenExpires = user.accessTokenExpires;
				delete token.error;
			}
			if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
				token.error = "SessionExpired";
			}
			// Depois de editar o perfil, o front chama update() para a topbar e o
			// dono do perfil continuarem certos sem precisar logar de novo.
			if (trigger === "update" && session) {
				if (typeof session.username === "string")
					token.username = session.username;
				if (typeof session.name === "string") token.name = session.name;
				if (session.image !== undefined) token.picture = session.image;
			}
			return token;
		},
		async session({ session, token }) {
			session.accessToken = token.accessToken;
			session.error = token.error;
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
};

/** Token do backend do usuário logado, para os server components (undefined sem login). */
export async function getServerAccessToken(): Promise<string | undefined> {
	const session = await getServerSession(authOptions);
	return session?.accessToken || undefined;
}
