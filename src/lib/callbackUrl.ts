/**
 * Para onde voltar depois do login/cadastro (?callbackUrl=/album/123).
 * Só aceita caminhos internos: evita redirecionar para outro site.
 */
export function safeCallbackUrl(value: string | null | undefined): string {
	if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
	if (value.startsWith("/login") || value.startsWith("/cadastro")) return "/";
	return value;
}

/** Link de login que volta para a página atual depois de entrar. */
export function loginHref(pathname: string | null | undefined): string {
	const callbackUrl = safeCallbackUrl(pathname);
	return callbackUrl === "/"
		? "/login"
		: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
