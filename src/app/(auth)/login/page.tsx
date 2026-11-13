"use client";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeCallbackUrl } from "@/lib/callbackUrl";
import { InputField } from "../../../components/InputField/InputField";
import styles from "./page.module.css";

/** Traduz o `error` devolvido pelo signIn (ver authorize no route.ts do NextAuth). */
function loginErrorMessage(error: string): string {
	return error === "CredentialsSignin"
		? "E-mail ou senha incorretos."
		: "Não foi possível conectar ao servidor. Tente novamente em instantes.";
}

function LoginForm() {
	const router = useRouter();
	const callbackUrl = safeCallbackUrl(useSearchParams().get("callbackUrl"));
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [rememberMe, setRememberMe] = useState(false);
	const [erro, setErro] = useState("");
	const [enviando, setEnviando] = useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setErro("");
		setEnviando(true);

		let result;
		try {
			result = await signIn("credentials", {
				email: email.trim(),
				password,
				rememberMe: String(rememberMe),
				redirect: false,
			});
		} catch {
			result = { error: "NETWORK_ERROR" };
		}

		if (!result || result.error) {
			setErro(loginErrorMessage(result?.error ?? "NETWORK_ERROR"));
			setEnviando(false);
			return;
		}

		router.push(callbackUrl);
		router.refresh();
	};

	return (
		<div>
			<h1 className={styles.title}>Que bom ter você de volta!</h1>
			<h2 className={styles.subtitle}>
				Acesse sua conta e continue sua jornada musical!
			</h2>
			<form className={styles.form} onSubmit={handleLogin}>
				<InputField
					label="Email"
					type="email"
					placeholder="seu@email.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					autoComplete="email"
					autoFocus
					required
				/>
				<InputField
					label="Senha"
					type="password"
					placeholder="..........."
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoComplete="current-password"
					required
				/>
				{erro && (
					<p role="alert" className={styles.error}>
						{erro}
					</p>
				)}
				<div className={styles.checkboxContainer}>
					<input
						type="checkbox"
						id="manter-conectado"
						className={styles.checkbox}
						checked={rememberMe}
						onChange={(e) => setRememberMe(e.target.checked)}
					/>
					<label htmlFor="manter-conectado" className={styles.checkboxLabel}>
						Manter conectado
					</label>
				</div>
				<button
					type="submit"
					className={styles.submitButton}
					disabled={enviando}
				>
					{enviando ? "Entrando..." : "Entrar"}
				</button>
			</form>
			<div className={styles.footer}>
				<span className={styles.footerText}>Ainda não tem conta? </span>
				<Link
					href={
						callbackUrl === "/"
							? "/cadastro"
							: `/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`
					}
					className={styles.footerLink}
				>
					Criar conta
				</Link>
			</div>
		</div>
	);
}

// useSearchParams precisa de Suspense no build estático do Next.
export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}
