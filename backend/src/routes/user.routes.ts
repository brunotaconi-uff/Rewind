import express, { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { 
  getAllUsers, 
  createUser,
  login,
  getMe,
  logout
} from "../controllers/user.controller";
import { getFeed, getProfile, updateMyProfile, uploadMyAvatar } from "../controllers/profile.controller";
import { addFavorite, listFavorites, removeFavorite } from "../controllers/favorite.controller";
import { MAX_AVATAR_BYTES } from "../services/avatar.service";

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
  uploadMyAvatar
);

// albumId é o externalId do álbum na API de música.
router.post("/me/favorites", authMiddleware, addFavorite);
router.delete("/me/favorites/:albumId", authMiddleware, removeFavorite);

// Perfil público. Fica depois de /me para não capturar essa rota.
router.get("/:username", getProfile);
router.get("/:username/favorites", listFavorites);
router.get("/:username/feed", getFeed);

export default router;