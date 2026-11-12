import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { AuthRequest } from "../middleware/auth.middleware";
import { saveAvatarService } from "../services/avatar.service";
import {
  getProfileByIdService,
  FEED_MAX_LIMIT,
  getProfileByUsernameService,
  getUserFeedService,
  updateProfileService,
  getFollowingFeedService
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

export const getFeed = async (req: Request<{ username: string }> & { userId?: string }, res: Response) => {
  let limit: number | undefined;
  if (req.query.limit !== undefined) {
    limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > FEED_MAX_LIMIT) {
      throw AppError.validation(`O parâmetro "limit" deve ser um inteiro entre 1 e ${FEED_MAX_LIMIT}.`);
    }
  }
  res.json({ data: await getUserFeedService(req.params.username, limit, req.userId) });
};

export const getFollowingFeed = async (
  req: AuthRequest,
  res: Response
) => {
  let limit: number | undefined;

  if (req.query.limit !== undefined) {
    limit = Number(req.query.limit);

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > FEED_MAX_LIMIT
    ) {
      throw AppError.validation(
        `O parâmetro "limit" deve ser um inteiro entre 1 e ${FEED_MAX_LIMIT}.`
      );
    }
  }

  const feed = await getFollowingFeedService(req.userId!, limit);

  return res.json({ data: feed });
};
