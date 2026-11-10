import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { getProfileByUsernameService, updateProfileService } from "../services/profile.service";
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
