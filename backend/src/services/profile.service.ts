import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import type { ProfileUpdate } from "./profile.validation";

// Dados públicos do perfil: nunca inclui email nem senha.
const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  bio: true,
  avatarUrl: true,
  city: true,
  country: true,
  createdAt: true,
} as const;

export interface ProfileStats {
  /** Álbuns diferentes que o usuário avaliou. */
  albumsRated: number;
  /** Avaliações com texto. */
  reviews: number;
  followers: number;
  following: number;
}

async function getStats(userId: string): Promise<ProfileStats> {
  const [ratedAlbums, reviews, followers, following] = await Promise.all([
    prisma.review.findMany({ where: { userId }, distinct: ["albumId"], select: { albumId: true } }),
    prisma.review.count({ where: { userId, content: { not: null }, NOT: { content: "" } } }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  return { albumsRated: ratedAlbums.length, reviews, followers, following };
}

async function buildProfile<T extends { id: string }>(user: T) {
  return { ...user, stats: await getStats(user.id) };
}

/** 5.2-B1: perfil público com os contadores. */
export const getProfileByUsernameService = async (username: string) => {
  const user = await prisma.user.findUnique({ where: { username }, select: publicUserSelect });
  if (!user) throw AppError.notFound("Usuário não encontrado.");
  return buildProfile(user);
};

export const getProfileByIdService = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw AppError.notFound("Usuário não encontrado.");
  return buildProfile(user);
};

const USERNAME_TAKEN = "Esse nome de usuário já está em uso.";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/** 5.2-B2: edita o perfil do usuário logado. O username continua único (sem diferenciar maiúsculas). */
export const updateProfileService = async (userId: string, update: ProfileUpdate) => {
  if (update.username) {
    const taken = await prisma.user.findFirst({
      where: { username: { equals: update.username, mode: "insensitive" }, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) throw AppError.conflict(USERNAME_TAKEN);
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: update });
  } catch (error) {
    // Dois usuários pegando o mesmo nome ao mesmo tempo: o índice único do banco barra o segundo.
    if (isUniqueViolation(error)) throw AppError.conflict(USERNAME_TAKEN);
    throw error;
  }

  return getProfileByIdService(userId);
};
