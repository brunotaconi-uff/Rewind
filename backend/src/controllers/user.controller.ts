import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppError } from "../errors/AppError";
import { parseUsername } from "../services/profile.validation";
import {
	getAllUsersService,
	createUserService,
	loginUserService,
	getUserByIdService,
} from "../services/user.service";
import { searchUsersService } from "../services/user-search.service";

// Os erros são lançados como AppError; o Express 5 encaminha erros de handlers
// async para o error.middleware, que responde { error: { code, message } }.

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readString(
	body: Record<string, unknown>,
	field: string,
	label: string,
): string {
	const value = body[field];
	if (typeof value !== "string" || value.trim() === "") {
		throw AppError.validation(`O campo ${label} é obrigatório.`);
	}
	return value.trim();
}

function readOptionalString(
	body: Record<string, unknown>,
	field: string,
): string | undefined {
	const value = body[field];
	return typeof value === "string" && value.trim() !== ""
		? value.trim()
		: undefined;
}

function readEmail(body: Record<string, unknown>): string {
	// E-mail sempre em minúsculas, para "Ana@x.com" e "ana@x.com" serem a mesma conta.
	const email = readString(body, "email", "e-mail").toLowerCase();
	if (!EMAIL_PATTERN.test(email)) {
		throw AppError.validation("Informe um e-mail válido.");
	}
	return email;
}

export const searchUsers = async (req: AuthRequest, res: Response) => {
  const username =
    typeof req.query.username === "string"
      ? req.query.username.trim()
      : "";

  if (!username) {
    throw AppError.validation(
      'Informe o nome de usuário no parâmetro "username".'
    );
  }

  const users = await searchUsersService(username, req.userId!);

  return res.json({ data: users });
};

export const getAllUsers = async (_req: Request, res: Response) => {
	res.json(await getAllUsersService());
};

export const createUser = async (req: Request, res: Response) => {
	const body = req.body ?? {};

  const name = readString(body, "name", "nome");
  const email = readEmail(body);
  const username = parseUsername(body.username);
  const password = body.password;
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw AppError.validation(`A senha deve ter, pelo menos, ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  const user = await createUserService({
    name,
    username, 
    email,
    password,
    bio: readOptionalString(body, "bio"),
    avatarUrl: readOptionalString(body, "avatarUrl"),
    city: readOptionalString(body, "city"),
    country: readOptionalString(body, "country")
  });

  res.status(201).json(user);

};

export const login = async (req: Request, res: Response) => {
	const body = req.body ?? {};

  const email = readEmail(body);
  const password = body.password;
  if (typeof password !== "string" || password === "") {
    throw AppError.validation("O campo senha é obrigatório.");
  }

  const result = await loginUserService({
    email,
    password,
    rememberMe: body.rememberMe === true,
  });

  res.status(200).json(result);
};

export const getMe = async (req: AuthRequest, res: Response) => {
	if (!req.userId) throw AppError.unauthorized();

  res.status(200).json(await getUserByIdService(req.userId));
};

export const logout = async (_req: Request, res: Response) => {
  res.status(200).json({ message: "Logout realizado com sucesso." });
};
