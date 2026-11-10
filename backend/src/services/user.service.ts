import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/env";
import { AppError } from "../errors/AppError";

const REMEMBER_ME_SECONDS = 30 * 24 * 60 * 60; // 30 dias
const DEFAULT_SESSION_SECONDS = 24 * 60 * 60; // 1 dia

const publicUserSelect = {
	id: true,
	name: true,
	username: true,
	bio: true,
	avatarUrl: true,
	createdAt: true,
} as const;

const ownUserSelect = {
	...publicUserSelect,
	email: true,
	city: true,
	country: true,
} as const;

export const getAllUsersService = async () => {
	return await prisma.user.findMany({ select: publicUserSelect });
};

export const createUserService = async (userData: {
	name: string;
	username: string;
	email: string;
	password: string;
	bio?: string;
	avatarUrl?: string;
	city?: string;
	country?: string;
}) => {
	const { name, username, email, password, bio, avatarUrl, city, country } =
		userData;

	const existingUser = await prisma.user.findFirst({
		where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
	});

	if (existingUser) {
		throw AppError.conflict(
      existingUser.email === email
       ? "Já existe um usuário cadastrado com este e-mail."
       : "Já existe um usuário cadastrado com este username.",
    );
	}

	const passwordHash = await bcrypt.hash(password, 10);

  return await prisma.user.create({
    data: { name, username, email, passwordHash, bio, avatarUrl, city, country },
    select: ownUserSelect,
  });
};

export const loginUserService = async ({
	email,
	password,
	rememberMe,
}: {
	email: string;
	password: string;
	rememberMe?: boolean;
}) => {
	const user = await prisma.user.findUnique({ where: { email }, });

	if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
		throw AppError.unauthorized("E-mail ou senha incorretos.");
	}

  const expiresInSeconds = rememberMe ? REMEMBER_ME_SECONDS : DEFAULT_SESSION_SECONDS;
  const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: expiresInSeconds });

  const { passwordHash: _passwordHash, ...safeUser } = user;

  return {
    token,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    user: safeUser,
  };
};

export const getUserByIdService = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
    select: ownUserSelect,
	});

	if (!user) {
		throw AppError.notFound("Usuário não encontrado");
	}

	return user;
};
