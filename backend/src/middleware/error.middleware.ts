import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../errors/AppError";

// Todas as respostas de erro do backend seguem o formato:
// { "error": { "code": "EXTERNAL_API_UNAVAILABLE", "message": "..." } }

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Rota ${req.method} ${req.path} não encontrada.`));
};

// O Express só reconhece o handler de erro pelos 4 parâmetros, mesmo sem usar o _next.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    if (error.status >= 500 || error.status === 429) {
      const cause = error.cause instanceof Error ? error.cause.message : error.cause;
      console.warn(`[${error.code}] ${error.message}`, cause ?? "");
    }
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  // Corpo acima do limite do express.json/express.raw (ex.: foto com mais de 2 MB).
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: { code: "VALIDATION_ERROR", message: "O arquivo enviado é grande demais." } });
    return;
  }

  // JSON malformado no corpo da requisição (express.json).
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "JSON inválido." } });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor." } });
};
