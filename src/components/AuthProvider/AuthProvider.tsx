"use client";

import { useEffect } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";

function SessionWatcher(){
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.error === "SessionExpired") {
            signOut({ callbackUrl: "/login" });
        }
    }, [session?.error]);

    return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <SessionWatcher />
            {children}
        </SessionProvider>
    );
}
