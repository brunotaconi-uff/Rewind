import express, { Router } from "express";
import {
	authMiddleware,
	optionalAuthMiddleware,
} from "../middleware/auth.middleware";
import {
	getAllUsers,
	createUser,
	login,
	getMe,
	logout,
	searchUsers,
} from "../controllers/user.controller";
import {
	getFeed,
	getProfile,
	updateMyProfile,
	uploadMyAvatar,
	getFollowingFeed,
} from "../controllers/profile.controller";
import {
	addFavorite,
	listFavorites,
	removeFavorite,
} from "../controllers/favorite.controller";
import { MAX_AVATAR_BYTES } from "../services/avatar.service";
import {
	getFollowStatus,
	followUser,
	unfollowUser,
} from "../controllers/follow.controller";

const router = Router();

router.get("/", getAllUsers);
router.get("/me", authMiddleware, getMe);

router.post("/", createUser);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);

router.patch("/me", authMiddleware, updateMyProfile);
// A foto vai crua no corpo (Content-Type image/...), sem multipart.
router.put(
	"/me/avatar",
	authMiddleware,
	express.raw({ type: "image/*", limit: MAX_AVATAR_BYTES }),
	uploadMyAvatar,
);

// albumId é o externalId do álbum na API de música.
router.post("/me/favorites", authMiddleware, addFavorite);
router.delete("/me/favorites/:albumId", authMiddleware, removeFavorite);

// Busca de usuários
router.get("/search", authMiddleware, searchUsers);

// Feed geral: atividades de quem o usuário segue
router.get("/feed", authMiddleware, getFollowingFeed);

// Seguir e deixar de seguir
router.get("/:userId/follow", authMiddleware, getFollowStatus);
router.post("/:userId/follow", authMiddleware, followUser);
router.delete("/:userId/follow", authMiddleware, unfollowUser);

// Perfil público. Fica depois de /me para não capturar essa rota.
router.get("/:username", getProfile);
router.get("/:username/favorites", listFavorites);
// Login opcional: com token, cada atividade diz se você curtiu (6.3).
router.get("/:username/feed", optionalAuthMiddleware, getFeed);

export default router;
