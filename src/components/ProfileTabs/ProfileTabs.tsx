"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ProfileTabs.module.css";

interface ProfileTabsProps {
  username: string;
}

export function ProfileTabs({ username }: ProfileTabsProps) {
  const pathname = usePathname();
  const base = `/profile/${encodeURIComponent(username)}`;

  const tabs = [
    { href: base, label: "Atividade" },
    { href: `${base}/reviews`, label: "Resenhas" },
    { href: `${base}/favorites`, label: "Favoritos" },
  ];

  return (
    <nav className={styles.tabs} aria-label="Seções do perfil">
      {tabs.map(({ href, label }) => {
        // O pathname vem decodificado; compara com o username cru.
        const active = decodeURIComponent(pathname) === decodeURIComponent(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
