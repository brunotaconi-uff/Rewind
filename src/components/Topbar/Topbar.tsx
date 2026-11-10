"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ComponentType } from "react";
import { HeartIcon, HomeIcon, LoginIcon, LogoutIcon, UserIcon } from "@/components/icons/icons";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import styles from "./Topbar.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  isActive: (pathname: string) => boolean;
}

const HOME_ITEM: NavItem = { href: "/", label: "Início", icon: HomeIcon, isActive: (pathname) => pathname === "/" };

/** Favoritos e Perfil apontam para o perfil do usuário logado. */
function userNavItems(username: string): NavItem[] {
  const profile = `/profile/${username}`;
  return [
    {
      href: `${profile}/favorites`,
      label: "Favoritos",
      icon: HeartIcon,
      isActive: (pathname) => pathname === `${profile}/favorites`,
    },
    {
      href: profile,
      label: "Perfil",
      icon: UserIcon,
      isActive: (pathname) => pathname.startsWith(profile) && !pathname.endsWith("/favorites"),
    },
  ];
}

export function Topbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const username = session?.accessToken ? session.user.username : null;

  const navItems = username ? [HOME_ITEM, ...userNavItems(username)] : [HOME_ITEM];

  return (
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand} aria-label="Rewind, página inicial">
        <Image src="/logo.svg" alt="" width={28} height={28} priority />
        <span className={styles.brandName}>Rewind</span>
      </Link>

      <SearchBar />

      <nav className={styles.nav} aria-label="Navegação principal">
        {navItems.map(({ href, label, icon: NavIcon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={active ? `${styles.navButton} ${styles.navButtonActive}` : styles.navButton}
            >
              <NavIcon size={20} />
            </Link>
          );
        })}

        {status !== "loading" && 
          (username ? (
            <button
              type="button"
              title="Sair"
              aria-label="Sair"
              className={styles.navButton}
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogoutIcon size={20} />
            </button>
          ) : (
            <Link href="/login" title="Entrar" aria-label="Entrar" className={styles.navButton}>
              <LoginIcon size={20} />
            </Link>
          ))}
      </nav>
    </header>
  );
}
