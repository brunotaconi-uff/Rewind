"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ComponentType } from "react";
import {
	HeartIcon,
	HomeIcon,
	LogoutIcon,
	UserIcon,
	UsersIcon,
} from "@/components/icons/icons";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { loginHref } from "@/lib/callbackUrl";
import styles from "./Topbar.module.css";

interface NavItem {
	href: string;
	label: string;
	icon: ComponentType<{ size?: number }>;
	isActive: (pathname: string) => boolean;
}

/** Favoritos e Perfil apontam para o usuário logado; sem login, levam para /login. */
function getNavItems(username: string | undefined): NavItem[] {
	const profile = username ? `/profile/${username}` : "/login";
	const favorites = username ? `${profile}/favorites` : "/login";

	return [
		{
			href: "/",
			label: "Início",
			icon: HomeIcon,
			isActive: (pathname) => pathname === "/",
		},
		{
			href: favorites,
			label: "Favoritos",
			icon: HeartIcon,
			isActive: (pathname) => Boolean(username) && pathname === favorites,
		},
		{
			href: "/feed",
			label: "Feed",
			icon: UsersIcon,
			isActive: (pathname) => pathname === "/feed",
		},
		{
			href: profile,
			label: "Perfil",
			icon: UserIcon,
			isActive: (pathname) =>
				Boolean(username) &&
				pathname.startsWith(profile) &&
				!pathname.endsWith("/favorites"),
		},
	];
}

export function Topbar() {
	const pathname = usePathname();
	const { data: session, status } = useSession();
	const loginLink = loginHref(pathname);

	return (
		<header className={styles.topbar}>
			<Link
				href="/"
				className={styles.brand}
				aria-label="Rewind, página inicial"
			>
				<Image src="/logo.svg" alt="" width={28} height={28} priority />
				<span className={styles.brandName}>Rewind</span>
			</Link>

			<SearchBar />

			<nav className={styles.nav} aria-label="Navegação principal">
				{getNavItems(session?.user.username)
					// Sem login, Favoritos e Perfil só levariam ao /login: o botão "Entrar" já faz isso.
					.filter(
						({ label }) =>
							status !== "unauthenticated" ||
							(label !== "Favoritos" && label !== "Perfil"),
					)
					.map(({ href, label, icon: NavIcon, isActive }) => {
						const active = isActive(pathname);
						return (
							<Link
								key={label}
								href={href}
								title={label}
								aria-label={label}
								aria-current={active ? "page" : undefined}
								className={
									active
										? `${styles.navButton} ${styles.navButtonActive}`
										: styles.navButton
								}
							>
								<NavIcon size={20} />
							</Link>
						);
					})}

				{/* Sem login: um botão claro para entrar, em vez de só ícones que levam ao /login. */}
				{status === "unauthenticated" && (
					<Link href={loginLink} className={styles.loginButton}>
						Entrar
					</Link>
				)}

				{session && (
					<button
						type="button"
						title="Sair"
						aria-label="Sair"
						className={styles.navButton}
						onClick={() => signOut({ callbackUrl: "/login" })}
					>
						<LogoutIcon size={20} />
					</button>
				)}
			</nav>
		</header>
	);
}
