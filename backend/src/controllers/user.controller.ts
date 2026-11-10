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
  try {
    const users = await getAllUsersService();

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      name,
      username,
      email,
      password,
      bio,
      avatarUrl,
      city,
      country
    } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        error: "name, username, email e password são campos obrigatórios"
      })
    }

    const user = await createUserService({
        name,
        username,
        email,
        password,
        bio,
        avatarUrl,
        city,
        country
    });

    return res.status(201).json(user);

  } catch (error) {
    console.error(error);

    if (
        error instanceof Error &&
        error.message === "Usuário com esse username ou email já existe"
    ) {
        return res.status(400).json({
            error: error.message
        });
    }

    return res.status(500).json({ 
      error: "Erro ao criar usuário"
    });
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "email e password são campos obrigatórios",
      });
    }

    const result = await loginUserService({
      email,
      password,
      rememberMe,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    if (
      error instanceof Error &&
      error.message === "Credenciais inválidas"
    ) {
      return res.status(401).json({
        error: "Credenciais inválidas",
      });
    }

    return res.status(500).json({
      error: "Erro ao realizar login",
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Usuário não autenticado",
      });
    }

    const user = await getUserByIdService(userId);

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar informações do usuário",
    });
  }
};

export const logout = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      message: "Logout realizado com sucesso"
    });
  } catch (error) {
    console.error(error);
    
    return res.status(500).json({
      error: "Erro ao realizar logout"
    });
  }
};  