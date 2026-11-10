import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { 
  getAllUsers, 
  createUser,
  login,
  getMe,
  logout
} from "../controllers/user.controller";
import { getProfile } from "../controllers/profile.controller";

const router = Router();

router.get("/", getAllUsers);
router.get("/me", authMiddleware, getMe);

router.post("/", createUser);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);

// Perfil público. Fica depois de /me para não capturar essa rota.
router.get("/:username", getProfile);

export default router;