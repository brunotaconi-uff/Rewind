import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import {
	likeReviewService,
	unlikeReviewService,
} from "../services/like.service";

const router = Router();

// 6.3-B2: curtir e descurtir uma atividade (nota ou resenha).
// As duas devolvem { reviewId, likesCount, likedByMe } para o front atualizar o contador.
router.post(
	"/:reviewId/like",
	authMiddleware,
	async (req: AuthRequest, res) => {
		res.json({
			data: await likeReviewService(req.userId!, String(req.params.reviewId)),
		});
	},
);

router.delete(
	"/:reviewId/like",
	authMiddleware,
	async (req: AuthRequest, res) => {
		res.json({
			data: await unlikeReviewService(req.userId!, String(req.params.reviewId)),
		});
	},
);

export default router;
