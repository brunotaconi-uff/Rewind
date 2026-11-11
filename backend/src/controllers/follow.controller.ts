import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  followUserService,
  unfollowUserService,
} from "../services/follow.service";
import { AppError } from "../errors/AppError";

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