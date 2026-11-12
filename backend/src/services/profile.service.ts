import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { albumSummarySelect, toAlbumSummary } from "./favorite.service";
import { likesSelect, withLikeFields } from "./like.service";
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
		prisma.review.findMany({
			where: { userId },
			distinct: ["albumId"],
			select: { albumId: true },
		}),
		prisma.review.count({
			where: { userId, content: { not: null }, NOT: { content: "" } },
		}),
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
	const user = await prisma.user.findUnique({
		where: { username },
		select: publicUserSelect,
	});
	if (!user) throw AppError.notFound("Usuário não encontrado.");
	return buildProfile(user);
};

export const getProfileByIdService = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: publicUserSelect,
	});
	if (!user) throw AppError.notFound("Usuário não encontrado.");
	return buildProfile(user);
};

const USERNAME_TAKEN = "Esse nome de usuário já está em uso.";

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

/** 5.2-B2: edita o perfil do usuário logado. O username continua único (sem diferenciar maiúsculas). */
export const updateProfileService = async (
	userId: string,
	update: ProfileUpdate,
) => {
	if (update.username) {
		const taken = await prisma.user.findFirst({
			where: {
				username: { equals: update.username, mode: "insensitive" },
				NOT: { id: userId },
			},
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

export const FEED_DEFAULT_LIMIT = 30;
export const FEED_MAX_LIMIT = 100;

/** 5.2-B5: notas e resenhas do usuário, das mais recentes para as mais antigas. */
export const getUserFeedService = async (
	username: string,
	limit = FEED_DEFAULT_LIMIT,
	/** Quem está vendo (6.3): define o likedByMe de cada atividade. */
	viewerId?: string,
) => {
	const user = await prisma.user.findUnique({
		where: { username },
		select: { id: true },
	});
	if (!user) throw AppError.notFound("Usuário não encontrado.");

	const reviews = await prisma.review.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: "desc" },
		take: limit,
		select: {
			id: true,
			userId: true,
			rating: true,
			content: true,
			createdAt: true,
			album: { select: albumSummarySelect },
			...likesSelect(viewerId),
		},
	});

	return reviews.map((review) => ({
		...withLikeFields(review),
		rating: Number(review.rating),
		// Avaliação só com nota fica com content null (texto vazio também conta como sem resenha).
		content: review.content?.trim() ? review.content : null,
		album: toAlbumSummary(review.album),
	}));
};

// 6.2-B4: feed geral com avaliações dos usuários seguidos
export const getFollowingFeedService = async (
	userId: string,
	limit = FEED_DEFAULT_LIMIT,
) => {
	const follows = await prisma.follow.findMany({
		where: {
			followerId: userId,
		},
		select: {
			followingId: true,
		},
	});

	const followingIds = follows.map((follow) => follow.followingId);

	if (followingIds.length === 0) {
		return [];
	}

	const reviews = await prisma.review.findMany({
		where: {
			userId: {
				in: followingIds,
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		take: limit,
		select: {
			id: true,
			rating: true,
			content: true,
			createdAt: true,
			user: {
				select: {
					id: true,
					name: true,
					username: true,
					avatarUrl: true,
				},
			},
			album: {
				select: albumSummarySelect,
			},
			userId: true,
			...likesSelect(userId),
		},
	});

	return reviews.map((review) => ({
		...withLikeFields(review),
		rating: Number(review.rating),
		content: review.content?.trim() ? review.content : null,
		album: toAlbumSummary(review.album),
	}));
};
