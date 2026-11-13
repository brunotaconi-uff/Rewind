import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  getFollowStatusService,
  followUserService,
  unfollowUserService,
} from "../services/follow.service";
import { AppError } from "../errors/AppError";
import { isUuid } from "../lib/uuid";

// Um id fora do formato uuid não existe no banco: responde 404 em vez de deixar o Prisma estourar.
function readUserId(req: AuthRequest): string {
  const userId = req.params.userId;
  if (!isUuid(userId)) throw AppError.notFound("Usuário não encontrado.");
  return userId;
}

export const getFollowStatus = async (req: AuthRequest, res: Response) => {
  const result = await getFollowStatusService(req.userId!, readUserId(req));
  return res.json({ data: result });
};

export const followUser = async (req: AuthRequest, res: Response) => {
  const result = await followUserService(req.userId!, readUserId(req));
  return res.status(200).json({ data: result });
};

export const unfollowUser = async (req: AuthRequest, res: Response) => {
  const result = await unfollowUserService(req.userId!, readUserId(req));
  return res.status(200).json({ data: result });
};
