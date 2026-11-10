import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { saveAvatarService } from "../services/avatar.service";
import {
  getProfileByIdService,
  getProfileByUsernameService,
  updateProfileService,
} from "../services/profile.service";
import { parseProfileUpdate } from "../services/profile.validation";

// Os erros (AppError) seguem para o error.middleware, que devolve
// { error: { code, message } } igual às rotas de música.

export const getProfile = async (req: Request<{ username: string }>, res: Response) => {
  const profile = await getProfileByUsernameService(req.params.username);
  res.json({ data: profile });
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const update = parseProfileUpdate(req.body);
  const profile = await updateProfileService(req.userId!, update);
  res.json({ data: profile });
};

export const uploadMyAvatar = async (req: AuthRequest, res: Response) => {
  await saveAvatarService(req.userId!, req.body, `${req.protocol}://${req.get("host")}`);
  res.json({ data: await getProfileByIdService(req.userId!) });
};
