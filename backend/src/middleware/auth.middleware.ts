import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/env";
import { AppError } from "../errors/AppError";

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware( req: AuthRequest, _res: Response, next: NextFunction) {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    throw AppError.unauthorized("Token não informado.");
  }

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    throw AppError.unauthorized("Sessão inválida ou expirada. Faça login novamente.");
  }

  if (typeof decoded !== "object" || typeof decoded.userId !== "string") {
    throw AppError.unauthorized("Sessão inválida. Faça login novamente.");
  }

  req.userId = decoded.userId;
  next();
}