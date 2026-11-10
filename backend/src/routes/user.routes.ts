import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { 
  getAllUsers, 
  createUser,
  login,
  getMe,
  logout
} from "../controllers/user.controller";
import { getProfile, updateMyProfile } from "../controllers/profile.controller";

const router = Router();

router.get("/", getAllUsers);
router.get("/me", authMiddleware, getMe);

router.post("/", createUser);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);

router.patch("/me", authMiddleware, updateMyProfile);

// Perfil público. Fica depois de /me para não capturar essa rota.
router.get("/:username", getProfile);

export default router;