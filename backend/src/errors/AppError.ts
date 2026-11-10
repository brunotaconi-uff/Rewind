export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "EXTERNAL_API_RATE_LIMITED"
  | "EXTERNAL_API_UNAVAILABLE"
  | "EXTERNAL_API_TIMEOUT"
  | "INTERNAL_ERROR";

/** Erro que o middleware sabe transformar em `{ error: { code, message } }`. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, status: number, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }

  static validation(message: string): AppError {
    return new AppError("VALIDATION_ERROR", 400, message);
  }

  static unauthorized(message = "Faça login para continuar."): AppError {
    return new AppError("UNAUTHORIZED", 401, message);
  }

  static notFound(message = "Recurso não encontrado."): AppError {
    return new AppError("NOT_FOUND", 404, message);
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", 409, message);
  }
}

/** Falha ao falar com a API de música externa, seja qual for o provider. */
export class ExternalApiError extends AppError {
  constructor(code: ErrorCode, status: number, message: string, options?: { cause?: unknown }) {
    super(code, status, message, options);
    this.name = "ExternalApiError";
  }

  static timeout(cause?: unknown): ExternalApiError {
    return new ExternalApiError(
      "EXTERNAL_API_TIMEOUT",
      504,
      "O serviço de música demorou demais para responder.",
      { cause },
    );
  }

  static rateLimited(cause?: unknown): ExternalApiError {
    return new ExternalApiError(
      "EXTERNAL_API_RATE_LIMITED",
      429,
      "Limite de requisições ao serviço de música atingido. Tente novamente em instantes.",
      { cause },
    );
  }

  /** 503 quando o serviço está fora/ocupado; 502 quando respondeu algo inválido. */
  static unavailable(status: 502 | 503, cause?: unknown): ExternalApiError {
    return new ExternalApiError(
      "EXTERNAL_API_UNAVAILABLE",
      status,
      "O serviço de música está indisponível no momento.",
      { cause },
    );
  }
}
