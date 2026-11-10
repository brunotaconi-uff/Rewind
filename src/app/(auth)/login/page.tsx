"use client";
import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { InputField } from "../../../components/InputField/InputField";
import styles from "./page.module.css";

function loginErrorMessage(error: string): string {
  return error === "CredentialsSignin" 
    ? "E-mail ou senha incorretos." 
    : "Ocorreu um erro ao tentar fazer login. Tente novamente.";
}

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso(true);

    const result = await signIn("credentials", {
      email,
      password,
      rememberMe: String(rememberMe),
      redirect: false,
    });

    if (result?.error) {
      setErro(loginErrorMessage(result.error));
      setSucesso(false);
      return;
    } 

    router.push("/");
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
          required
        />
        <InputField
          label="Senha"
          type="password"
          placeholder="..........."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {erro && (
          <p role="alert" style={{ color: "red", fontSize: "14px", marginBottom: "16px" }}>
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
        <button type="submit" className={styles.submitButton} disabled={sucesso}>
          {sucesso ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <div className={styles.footer}>
        <span className={styles.footerText}>Ainda não tem conta? </span>
        <Link href="/cadastro" className={styles.footerLink}>
          Criar conta
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
