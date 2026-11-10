import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions);

// const handler = NextAuth({
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         // aq fiz apenas um mock pra testar, dps vou retirar glr qnd tiver o backend
//         if (
//           credentials?.email === "lucas@teste.com" &&
//           credentials?.password === "123456"
//         ) {
//           return {
//             id: "1",
//             name: "lucas teste",
//             email: "lucas@teste.com",
//           };
//         }
//         return null;
//       },
//     }),
//   ],
//   pages: {
//     signIn: "/login",
//   },
// });

export { handler as GET, handler as POST };
