import { Router } from "express";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

function readAlbumId(value: unknown): string {
    if (typeof value !== "string" || !value) throw AppError.validation("ID de álbum inválido.");
    return value;
}

function readRating(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0.5 || value > 5 || value * 10 % 5 !== 0) {
        throw AppError.validation('A nota deve ser um número entre 0,5 e 5, em incrementos de 0,5.');
    }
    return value;
}

function readContent(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") throw AppError.validation('O campo "content" deve ser um texto.');
    const content = value.trim();
    if (content.length > 5000) throw AppError.validation('O campo "content" deve ter no máximo 5000 caracteres.');
    return content || null;
}

function readReviewUpdate(body: unknown): { rating?: number; content?: string | null } {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw AppError.validation("O corpo da requisição deve ser um objeto.");
    }
    const input = body as Record<string, unknown>;
    const update: { rating?: number; content?: string | null } = {};
    if ("rating" in input) update.rating = readRating(input.rating);
    if ("content" in input) update.content = readContent(input.content);
    if (Object.keys(update).length === 0) {
        throw AppError.validation('Informe ao menos um campo: "rating" ou "content".');
    }
    return update;
}

function isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

router.post("/:id/reviews", authMiddleware, async (req: AuthRequest, res) => {
    const externalId = readAlbumId(req.params.id);
    const rating = readRating(req.body?.rating);
    const content = readContent(req.body?.content);
    const album = await prisma.album.findUnique({
        where: { externalId },
        select: { id: true },
    });
    if (!album) throw AppError.notFound("Álbum não encontrado.");

    let review;
    try {
        review = await prisma.review.create({
            data: { userId: req.userId!, albumId: album.id, rating, content },
            select: { id: true, rating: true, content: true, createdAt: true },
        });
    } catch (error) {
        if (isUniqueViolation(error)) throw AppError.conflict("Você já avaliou este álbum.");
        throw error;
    }
    res.status(201).json({ data: { ...review, rating: Number(review.rating) } });
});

router.patch("/:id/reviews/:reviewId", authMiddleware, async (req: AuthRequest, res) => {
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
        select: { id: true, rating: true, content: true, createdAt: true },
    });
    res.json({ data: { ...updated, rating: Number(updated.rating) } });
});

router.get("/:id/rating", async (req, res) => {
    const { id } = req.params;

    const result = await prisma.review.aggregate({
        where: {
            album: { externalId: id }
        },
        _avg: { rating: true },
        _count: { _all: true }
    });

    const average = result._avg.rating;

    res.json({
        data: {
            albumId: id,
            averageRating: average === null ? null : Math.round(Number(average) * 10) / 10,
            ratingsCount: result._count._all
        }
    });
});

// Só avaliações com texto (resenhas), das mais recentes para as mais antigas.
router.get("/:id/reviews", async (req, res) => {
    const { id } = req.params;

    const reviews = await prisma.review.findMany({
        where: {
            album: { externalId: id },
            content: { not: null },
            NOT: { content: "" }
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            rating: true,
            content: true,
            createdAt: true,
            user: {
                select: { id: true, name: true, username: true, avatarUrl: true }
            }
        }
    });

    res.json({
        data: reviews.map((review) => ({
            ...review,
            rating: Number(review.rating)
        }))
    });
});

export default router;