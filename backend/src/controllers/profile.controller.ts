import { Request, Response } from "express";
import { getProfileByUsernameService } from "../services/profile.service";

// Os erros (AppError) seguem para o error.middleware, que devolve
// { error: { code, message } } igual às rotas de música.

export const getProfile = async (req: Request<{ username: string }>, res: Response) => {
  const profile = await getProfileByUsernameService(req.params.username);
  res.json({ data: profile });
};
