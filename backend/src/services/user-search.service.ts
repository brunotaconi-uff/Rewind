import { prisma } from "../lib/prisma";

export const searchUsersService = async (
  username: string,
  currentUserId: string
) => {
  return prisma.user.findMany({
    where: {
      username: {
        contains: username,
        mode: "insensitive",
      },
      NOT: {
        id: currentUserId,
      },
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
    },
    orderBy: {
      username: "asc",
    },
    take: 20,
  });
};