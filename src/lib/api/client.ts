// Client HTTP do front. Todas as chamadas passam por aqui e vão para o
// backend do Rewind; o front nunca fala direto com a API de música externa.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Códigos do backend + os que o próprio client gera. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "EXTERNAL_API_RATE_LIMITED"
  | "EXTERNAL_API_UNAVAILABLE"
  | "EXTERNAL_API_TIMEOUT"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

const KNOWN_CODES: readonly string[] = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "EXTERNAL_API_RATE_LIMITED",
  "EXTERNAL_API_UNAVAILABLE",
  "EXTERNAL_API_TIMEOUT",
  "INTERNAL_ERROR",
];

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** Converte qualquer erro capturado em um código que a UI sabe exibir. */
export function getErrorCode(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : "UNKNOWN_ERROR";
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Objeto vira JSON; Blob/File vai cru, com o tipo do próprio arquivo. */
  body?: unknown;
  /** Token do backend (session.accessToken) para as rotas que exigem login. */
  token?: string;
  init?: RequestInit;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, init } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let requestBody: BodyInit | undefined;
  if (body instanceof Blob) {
    requestBody = body;
    if (body.type) headers["Content-Type"] = body.type;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    // O backend já faz cache das respostas da API externa; aqui buscamos sempre.
    response = await fetch(API_URL + path, {
      cache: "no-store",
      ...init,
      method,
      body: requestBody,
      headers: { ...headers, ...init?.headers },
    });
  } catch (error) {
    throw new ApiError("NETWORK_ERROR", 0, "Não foi possível conectar ao servidor.", { cause: error });
  }

  // 204 e respostas sem JSON viram null.
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const error = responseBody?.error;
    // As rotas de usuário antigas e o authMiddleware devolvem { error: "mensagem" }.
    if (response.status === 401) {
      const message = typeof error === "string" ? error : error?.message;
      throw new ApiError("UNAUTHORIZED", 401, message ?? "Faça login para continuar.");
    }
    const code = KNOWN_CODES.includes(error?.code) ? (error.code as ApiErrorCode) : "UNKNOWN_ERROR";
    throw new ApiError(code, response.status, error?.message ?? `Erro HTTP ${response.status}`);
  }
  return responseBody as T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, { init });
}
