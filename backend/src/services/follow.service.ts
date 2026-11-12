import { prisma } from "../lib/prisma";
import { AppError } from "../errors/AppError";

export const getFollowStatusService = async (
  followerId: string,
  followingId: string
) => {
  if (followerId === followingId) {
    return { following: false };
  }

  const relation = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
    select: { followerId: true },
  });

  return { following: relation !== null };
};

export const followUserService = async (
  followerId: string,
  followingId: string
) => {
  if (followerId === followingId){
    throw AppError.validation("Você não pode seguir a si mesmo.");
  }

  const user = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true },
  });

  if (!user){
    throw AppError.notFound("Usuário não encontrado.");
  }

  // O upsert evita duplicar a relação caso o usuário já siga essa pessoa.
  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
    create: {
      followerId,
      followingId,
    },
    update: {},
  });

  return { following: true };
};

export const unfollowUserService = async (
  followerId: string,
  followingId: string
) => {
  if (followerId === followingId){
    throw AppError.validation("Você não pode deixar de seguir a si mesmo.");
  }

  await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  });

  return { following: false };
};