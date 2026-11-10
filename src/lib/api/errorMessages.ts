import type { ApiErrorCode } from "./client";

// Mensagens amigáveis para cada código do erro padronizado do backend.
const MESSAGES: Record<ApiErrorCode, string> = {
  EXTERNAL_API_UNAVAILABLE: "O serviço de música está fora do ar no momento. Tente novamente em alguns minutos.",
  EXTERNAL_API_TIMEOUT: "O serviço de música demorou para responder. Tente novamente.",
  EXTERNAL_API_RATE_LIMITED: "Muitas buscas em pouco tempo. Aguarde alguns segundos e tente de novo.",
  UNAUTHORIZED: "Sua sessão expirou. Faça login novamente.",
  NOT_FOUND: "Não encontramos o que você procurou.",
  CONFLICT: "Esse registro já existe.",
  VALIDATION_ERROR: "Algum dado da busca está inválido. Confira e tente de novo.",
  NETWORK_ERROR: "Não foi possível conectar ao servidor do Rewind. Verifique sua conexão.",
  INTERNAL_ERROR: "Algo deu errado do nosso lado. Tente novamente.",
  UNKNOWN_ERROR: "Algo deu errado. Tente novamente.",
};

export function getErrorMessage(code: ApiErrorCode): string {
  return MESSAGES[code] ?? MESSAGES.UNKNOWN_ERROR;
}
