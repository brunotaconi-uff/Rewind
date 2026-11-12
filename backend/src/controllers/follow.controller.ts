import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  getFollowStatusService,
  followUserService,
  unfollowUserService,
} from "../services/follow.service";
import { AppError } from "../errors/AppError";

export const getFollowStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId;

  if (typeof userId !== "string") {
    throw AppError.validation("ID de usuário inválido.");
  }

  const result = await getFollowStatusService(req.userId!, userId);
  return res.json({ data: result });
};

export const followUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId;

  if (typeof userId !== "string") {
    throw AppError.validation("ID de usuário inválido.");
  }

 const result = await followUserService(req.userId!, userId);

  return res.status(200).json({ data: result });
};

export const unfollowUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId;

  if (typeof userId !== "string") {
    throw AppError.validation("ID de usuário inválido.");
  }

  const result = await unfollowUserService(req.userId!, userId);

  return res.status(200).json({ data: result });
};