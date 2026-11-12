import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/env";
import { AppError } from "../errors/AppError";

export interface AuthRequest extends Request {
	userId?: string;
}

function readBearerToken(req: Request): string | null {
	const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
	return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

/** userId do token, ou null se o token for inválido ou estiver vencido. */
function readUserId(token: string): string | null {
	try {
		const decoded = jwt.verify(token, getJwtSecret());
		return typeof decoded === "object" && typeof decoded.userId === "string"
			? decoded.userId
			: null;
	} catch {
		return null;
	}
}

export function authMiddleware(
	req: AuthRequest,
	_res: Response,
	next: NextFunction,
) {
	const token = readBearerToken(req);
	if (!token) {
		throw AppError.unauthorized("Token não informado.");
	}

	const userId = readUserId(token);
	if (!userId) {
		throw AppError.unauthorized(
			"Sessão inválida ou expirada. Faça login novamente.",
		);
	}

	req.userId = userId;
	next();
}

/**
 * Para rotas públicas que mudam um detalhe quando há login (ex.: 6.3, "curti").
 * Sem token, ou com token inválido, segue sem userId em vez de responder 401.
 */
export function optionalAuthMiddleware(
	req: AuthRequest,
	_res: Response,
	next: NextFunction,
) {
	const token = readBearerToken(req);
	const userId = token ? readUserId(token) : null;
	if (userId) req.userId = userId;
	next();
}
