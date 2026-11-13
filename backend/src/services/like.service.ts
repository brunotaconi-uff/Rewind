import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { isUuid } from "../lib/uuid";
import { isUniqueViolation } from "./album.service";

// 6.3: curtidas nas atividades (notas e resenhas). A tabela ReviewLike tem
// chave (userId, reviewId), então cada pessoa curte cada atividade uma vez só.

// Sem login, o filtro de "curti" usa um id que não é de ninguém
// (a coluna é uuid, então não dá para usar um texto qualquer).
const NO_USER_ID = "00000000-0000-0000-0000-000000000000";

/** 6.3-B3: trecho de select com o total de curtidas e se quem está vendo curtiu. */
export function likesSelect(viewerId?: string) {
	return {
		_count: { select: { likes: true } },
		likes: {
			where: { userId: viewerId ?? NO_USER_ID },
			select: { userId: true },
		},
	};
}

type WithLikes = { _count: { likes: number }; likes: { userId: string }[] };

/** Troca o _count/likes do Prisma por likesCount/likedByMe na resposta. */
export function withLikeFields<T extends WithLikes>({
	_count,
	likes,
	...review
}: T) {
	return { ...review, likesCount: _count.likes, likedByMe: likes.length > 0 };
}

export interface LikeSummary {
	reviewId: string;
	likesCount: number;
	likedByMe: boolean;
}

async function findReviewAuthor(reviewId: string): Promise<string> {
	const review = isUuid(reviewId)
		? await prisma.review.findUnique({
				where: { id: reviewId },
				select: { userId: true },
			})
		: null;
	if (!review) throw AppError.notFound("Atividade não encontrada.");
	return review.userId;
}

async function getLikeSummary(
	userId: string,
	reviewId: string,
): Promise<LikeSummary> {
	const [likesCount, like] = await Promise.all([
		prisma.reviewLike.count({ where: { reviewId } }),
		prisma.reviewLike.findUnique({
			where: { userId_reviewId: { userId, reviewId } },
			select: { userId: true },
		}),
	]);
	return { reviewId, likesCount, likedByMe: like !== null };
}

/** 6.3-B2: curte a atividade de outra pessoa. Curtir de novo não dá erro nem conta duas vezes. */
export const likeReviewService = async (
	userId: string,
	reviewId: string,
): Promise<LikeSummary> => {
	const authorId = await findReviewAuthor(reviewId);
	if (authorId === userId)
		throw AppError.validation("Você não pode curtir a sua própria atividade.");

	try {
		await prisma.reviewLike.upsert({
			where: { userId_reviewId: { userId, reviewId } },
			create: { userId, reviewId },
			update: {},
		});
	} catch (error) {
		// Dois cliques ao mesmo tempo: a curtida já foi gravada pelo outro.
		if (!isUniqueViolation(error)) throw error;
	}
	return getLikeSummary(userId, reviewId);
};

/** 6.3-B2: descurte. Descurtir o que não estava curtido não dá erro. */
export const unlikeReviewService = async (
	userId: string,
	reviewId: string,
): Promise<LikeSummary> => {
	await findReviewAuthor(reviewId);
	await prisma.reviewLike.deleteMany({ where: { userId, reviewId } });
	return getLikeSummary(userId, reviewId);
};
