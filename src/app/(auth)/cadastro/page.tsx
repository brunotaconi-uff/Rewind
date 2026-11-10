"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { InputField } from "../../../components/InputField/InputField";
import { ApiError, apiPost } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errorMessages";
import styles from "./page.module.css";

const MIN_PASSWORD_LENGTH = 6;
// Mesma regra do backend (backend/src/controllers/user.controller.ts).
const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;

/** Mensagem para o erro de POST /users. Validação e conflito trazem o texto do backend. */
function signupErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.code === "VALIDATION_ERROR" || error.code === "CONFLICT")
			return error.message;
		return getErrorMessage(error.code);
	}
	return getErrorMessage("UNKNOWN_ERROR");
}

const CadastroPage = () => {
	const router = useRouter();
	const [nome, setNome] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [senha, setSenha] = useState("");
	const [confirmaSenha, setConfirmaSenha] = useState("");
	const [rememberMe, setRememberMe] = useState(false);
	const [erro, setErro] = useState("");
	const [sucesso, setSucesso] = useState(false);

	const handleCadastro = async (e: React.FormEvent) => {
		e.preventDefault();
		setErro("");

		if (!USERNAME_PATTERN.test(username)) {
			setErro("O nome de usuário deve ter de 3 a 30 caracteres: letras minúsculas, números, ponto ou _");
			return;
		}

		if (senha !== confirmaSenha) {
			setErro("As senhas não coincidem. Tente novamente.");
			return;
		}

		if (senha.length < MIN_PASSWORD_LENGTH) {
			setErro(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
			return;
		}

		setSucesso(true);

    try {
      await apiPost("/users", { name: nome, username, email, password: senha });
    } catch (error) {
      setErro(signupErrorMessage(error));
      setSucesso(false);
      return;
    }

    //conta criada: já entra automaticamente
    const result = await signIn("credentials", {
      email,
      password: senha,
      rememberMe: String(rememberMe),
      redirect: false,
    });

    if(result?.error) {
      //a conta existe mas o login automatico falhou. manda pro login normal
      router.push("/login");
      return;
    }

    router.push("/"); //login automatico deu certo vai pro home    
    router.refresh();
	};

	return (
		<div>
			<h1 className={styles.title}>Crie sua conta!</h1>
			<h2 className={styles.subtitle}>
				Sua jornada musical começa aqui.
				<br />
				Cadastre-se em menos de um minuto.
			</h2>
			<form className={styles.form} onSubmit={handleCadastro}>
				<InputField
					label="Nome"
					type="text"
					placeholder="Digite seu nome"
					value={nome}
					onChange={(e) => setNome(e.target.value)}
					required
				/>
        <InputField
					label="Nome de usuário"
					type="text"
					placeholder="username"
					value={username}
					onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
          autoComplete="username"
					required
				/>
				<InputField
					label="Email"
					type="email"
					placeholder="seu@email.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<InputField
					label="Senha"
					type="password"
					placeholder="..........."
					value={senha}
					onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
					required
				/>
				<InputField
					label="Confirme sua senha"
					type="password"
					placeholder="..........."
					value={confirmaSenha}
					onChange={(e) => setConfirmaSenha(e.target.value)}
          autoComplete="new-password"
					required
				/>
				{erro && (
					<p role="alert" style={{ color: "red", fontSize: "14px", marginBottom: "16px" }}>
						{erro}
					</p>
				)}
				{/* {sucesso && (
					<p style={{ color: "green", fontSize: "14px", marginBottom: "16px" }}>
						Conta criada com sucesso!
					</p>
				)} */}
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
				<button type="submit" className={styles.submitButton} disabled={sucesso}>
					{sucesso ? "Criando conta..." : "Criar meu perfil"}
				</button>
			</form>
			<div className={styles.footer}>
				<span className={styles.footerText}>Já tem uma conta? </span>
				<Link href="/login" className={styles.footerLink}>
					Fazer login
				</Link>
			</div>
		</div>
	);
};

export default CadastroPage;