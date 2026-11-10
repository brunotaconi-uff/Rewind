import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/env";
import { AppError } from "../errors/AppError";

// Validade do token: 30 dias com "lembrar conta", 1 dia sem.
const REMEMBER_ME_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_SESSION_SECONDS = 24 * 60 * 60;

const EMAIL_TAKEN = "Já existe um usuário cadastrado com este e-mail.";
const USERNAME_TAKEN = "Esse nome de usuário já está em uso.";

/** Campos que outros usuários podem ver (sem e-mail e sem hash da senha). */
const listUserSelect = {
	id: true,
	name: true,
	username: true,
	bio: true,
	avatarUrl: true,
	createdAt: true,
} as const;

/** Campos que o próprio usuário vê sobre si (nunca inclui o hash da senha). */
const ownUserSelect = {
	...listUserSelect,
	email: true,
	city: true,
	country: true,
} as const;

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

export const getAllUsersService = async () => {
	return await prisma.user.findMany({ select: listUserSelect });
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

	// Username sem diferenciar maiúsculas, como na edição de perfil (profile.service.ts).
	const existingUser = await prisma.user.findFirst({
		where: {
			OR: [{ email }, { username: { equals: username, mode: "insensitive" } }],
		},
		select: { email: true },
	});

	if (existingUser) {
		throw AppError.conflict(
			existingUser.email === email ? EMAIL_TAKEN : USERNAME_TAKEN,
		);
	}

	const passwordHash = await bcrypt.hash(password, 10);

	try {
		return await prisma.user.create({
			data: {
				name,
				username,
				email,
				passwordHash,
				bio,
				avatarUrl,
				city,
				country,
			},
			select: ownUserSelect,
		});
	} catch (error) {
		// Dois cadastros iguais ao mesmo tempo: o índice único do banco barra o segundo.
		if (isUniqueViolation(error))
			throw AppError.conflict("E-mail ou nome de usuário já está em uso.");
		throw error;
	}
};

export const loginUserService = async ({
	email,
	password,
	rememberMe,
}: {
	email: string;
	password: string;
	rememberMe: boolean;
}) => {
	const user = await prisma.user.findUnique({ where: { email } });

	// Mesma mensagem para e-mail inexistente e senha errada, para não revelar quais e-mails têm conta.
	if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
		throw AppError.unauthorized("E-mail ou senha incorretos.");
	}

	const expiresInSeconds = rememberMe
		? REMEMBER_ME_SECONDS
		: DEFAULT_SESSION_SECONDS;
	const token = jwt.sign({ userId: user.id }, getJwtSecret(), {
		expiresIn: expiresInSeconds,
	});

	return {
		token,
		/** Data ISO em que o token expira; o front usa para encerrar a sessão junto. */
		expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
		user: {
			id: user.id,
			name: user.name,
			username: user.username,
			email: user.email,
			bio: user.bio,
			avatarUrl: user.avatarUrl,
			city: user.city,
			country: user.country,
			createdAt: user.createdAt,
		},
	};
};

export const getUserByIdService = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: ownUserSelect,
	});

	if (!user) {
		throw AppError.notFound("Usuário não encontrado.");
	}

	return user;
};
