import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppError } from "../errors/AppError";
import { 
    getAllUsersService, 
    createUserService, 
    loginUserService,
    getUserByIdService
} from "../services/user.service";

const MIN_PASSWORD_LENGTH = 6;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/; 
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readString(body: Record<string, unknown>, field: string, label: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw AppError.validation(`O campo ${label} é obrigatório.`);
  }
  return value.trim();
}

function readOptionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function readEmail(body: Record<string, unknown>): string {
  const email = readString(body, "email", "e-mail").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw AppError.validation("Informe um e-mail válido.");
  }
  return email;
}

export const getAllUsers = async (_req: Request, res: Response) => {
  res.json(await getAllUsersService());
};

export const createUser = async (req: Request, res: Response) => {
  const body = req.body ?? {};

  const name = readString(body, "name", "nome");
  const email = readEmail(body);
  const username = readString(body, "username", "nome de usuário").toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    throw AppError.validation(
      "O nome de usuário deve ter de 3 a 30 caracteres: letras, números, ponto ou _.",
    );
  }

  // A senha não passa por trim: espaços fazem parte dela.
  const password = body.password;
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw AppError.validation(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const user = await createUserService({
    name,
    username,
    email,
    password,
    bio: readOptionalString(body, "bio"),
    avatarUrl: readOptionalString(body, "avatarUrl"),
    city: readOptionalString(body, "city"),
    country: readOptionalString(body, "country"),
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
  // O authMiddleware garante o userId; a checagem é só para o TypeScript.
  if (!req.userId) throw AppError.unauthorized();

  res.status(200).json(await getUserByIdService(req.userId));
};

// O JWT não fica guardado no servidor: o logout acontece no front, que descarta o token.
export const logout = async (_req: Request, res: Response) => {
  res.status(200).json({ message: "Logout realizado com sucesso" });
};