import { prisma } from "../lib/prisma";

// Busca pelo nome de usuário ou pelo nome de exibição.
export const searchUsersService = async (
  query: string,
  currentUserId: string
) => {
  return prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
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