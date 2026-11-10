// Client HTTP do front. Todas as chamadas passam por aqui e vão para o
// backend do Rewind; o front nunca fala direto com a API de música externa.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Códigos do backend + os que o próprio client gera. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "EXTERNAL_API_RATE_LIMITED"
  | "EXTERNAL_API_UNAVAILABLE"
  | "EXTERNAL_API_TIMEOUT"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

const KNOWN_CODES: readonly string[] = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
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

interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  /** Token JWT do usuário logado (session.accessToken), enviado como Bearer. */
  token?: string;
}

async function apiRequest<T>(method: string, path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;

  let response: Response;
  try {
    // O backend já faz cache das respostas da API externa; aqui buscamos sempre.
    response = await fetch(API_URL + path, {
      cache: "no-store",
      ...init,
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
    });
  } catch (error) {
    throw new ApiError("NETWORK_ERROR", 0, "Não foi possível conectar ao servidor.", { cause: error });
  }

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const error = responseBody?.error;
    const code = KNOWN_CODES.includes(error?.code) ? (error.code as ApiErrorCode) : "UNKNOWN_ERROR";
    throw new ApiError(code, response.status, error?.message ?? `Erro HTTP ${response.status}`);
  }
  return responseBody as T;
}

export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>("GET", path, undefined, options);
}

export function apiPost<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return apiRequest<T>("POST", path, body ?? {}, options);
}