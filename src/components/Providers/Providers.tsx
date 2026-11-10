"use client";

import { SessionProvider } from "next-auth/react";

/** Contextos de cliente usados no app inteiro (por enquanto, só a sessão do NextAuth). */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
