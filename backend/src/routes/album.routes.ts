import { Router } from "express";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import { ensureAlbum, isUniqueViolation } from "../services/album.service";
import { getMusicProvider } from "../services/music/music.provider";
import type { MusicProvider } from "../services/music/music.types";

function readAlbumId(value: unknown): string {
	if (typeof value !== "string" || !value)
		throw AppError.validation("ID de álbum inválido.");
	return value;
}

function readRating(value: unknown): number {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0.5 ||
		value > 5 ||
		(value * 10) % 5 !== 0
	) {
		throw AppError.validation(
			"A nota deve ser um número entre 0,5 e 5, em incrementos de 0,5.",
		);
	}
	return value;
}

function readContent(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== "string")
		throw AppError.validation('O campo "content" deve ser um texto.');
	const content = value.trim();
	if (content.length > 5000)
		throw AppError.validation(
			'O campo "content" deve ter no máximo 5000 caracteres.',
		);
	return content || null;
}

function readReviewUpdate(body: unknown): {
	rating?: number;
	content?: string | null;
} {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		throw AppError.validation("O corpo da requisição deve ser um objeto.");
	}
	const input = body as Record<string, unknown>;
	const update: { rating?: number; content?: string | null } = {};
	if ("rating" in input) update.rating = readRating(input.rating);
	if ("content" in input) update.content = readContent(input.content);
	if (Object.keys(update).length === 0) {
		throw AppError.validation(
			'Informe ao menos um campo: "rating" ou "content".',
		);
	}
	return update;
}

const reviewSelect = {
	id: true,
	rating: true,
	content: true,
	createdAt: true,
} as const;

// 5.4-B5: a média é calculada na hora, então já reflete toda avaliação criada ou editada.
async function getAlbumRating(externalId: string) {
	const result = await prisma.review.aggregate({
		where: { album: { externalId } },
		_avg: { rating: true },
		_count: { _all: true },
	});
	const average = result._avg.rating;
	return {
		albumId: externalId,
		averageRating:
			average === null ? null : Math.round(Number(average) * 10) / 10,
		ratingsCount: result._count._all,
	};
}

export function createAlbumRouter(
	musicProvider: MusicProvider = getMusicProvider(),
) {
	const router = Router();

	router.post("/:id/reviews", authMiddleware, async (req: AuthRequest, res) => {
		const externalId = readAlbumId(req.params.id);
		const content = readContent(req.body?.content);
		// 5.4-B3: resenha precisa de nota.
		if (
			content !== null &&
			(req.body?.rating === undefined || req.body?.rating === null)
		) {
			throw AppError.validation("Dê uma nota para publicar a resenha.");
		}
		const rating = readRating(req.body?.rating);
		// 5.4-B4: grava o álbum (título, capa e artistas) na primeira avaliação.
		const albumId = await ensureAlbum(externalId, musicProvider);

		let review;
		try {
			review = await prisma.review.create({
				data: { userId: req.userId!, albumId, rating, content },
				select: reviewSelect,
			});
		} catch (error) {
			if (isUniqueViolation(error))
				throw AppError.conflict("Você já avaliou este álbum.");
			throw error;
		}
		res.status(201).json({
			data: {
				...review,
				rating: Number(review.rating),
				albumRating: await getAlbumRating(externalId),
			},
		});
	});

	// 5.4-B2: avaliação do usuário logado, para o modal abrir preenchido (null se ainda não avaliou).
	router.get(
		"/:id/reviews/me",
		authMiddleware,
		async (req: AuthRequest, res) => {
			const externalId = readAlbumId(req.params.id);
			const review = await prisma.review.findFirst({
				where: { userId: req.userId!, album: { externalId } },
				select: reviewSelect,
			});
			res.json({
				data: review ? { ...review, rating: Number(review.rating) } : null,
			});
		},
	);

	router.patch(
		"/:id/reviews/:reviewId",
		authMiddleware,
		async (req: AuthRequest, res) => {
			const externalId = readAlbumId(req.params.id);
			const reviewId = readAlbumId(req.params.reviewId);
			const update = readReviewUpdate(req.body);
			const review = await prisma.review.findFirst({
				where: {
					id: reviewId,
					userId: req.userId!,
					album: { externalId },
				},
				select: { id: true },
			});
			if (!review) throw AppError.notFound("Avaliação não encontrada.");

			const updated = await prisma.review.update({
				where: { id: review.id },
				data: update,
				select: reviewSelect,
			});
			res.json({
				data: {
					...updated,
					rating: Number(updated.rating),
					albumRating: await getAlbumRating(externalId),
				},
			});
		},
	);

	router.get("/:id/rating", async (req, res) => {
		res.json({ data: await getAlbumRating(req.params.id) });
	});

	// Só avaliações com texto (resenhas), das mais recentes para as mais antigas.
	router.get("/:id/reviews", async (req, res) => {
		const { id } = req.params;

		const reviews = await prisma.review.findMany({
			where: {
				album: { externalId: id },
				content: { not: null },
				NOT: { content: "" },
			},
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				rating: true,
				content: true,
				createdAt: true,
				user: {
					select: { id: true, name: true, username: true, avatarUrl: true },
				},
			},
		});

		res.json({
			data: reviews.map((review) => ({
				...review,
				rating: Number(review.rating),
			})),
		});
	});

	return router;
}
