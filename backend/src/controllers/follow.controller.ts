import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  followUserService,
  unfollowUserService,
} from "../services/follow.service";

export const followUser = async (req: AuthRequest, res: Response) => {
  const result = await followUserService(
    req.userId!,
    req.params.userId
  );

  return res.status(200).json({ data: result });
};

export const unfollowUser = async (req: AuthRequest, res: Response) => {
  const result = await unfollowUserService(
    req.userId!,
    req.params.userId
  );

  return res.status(200).json({ data: result });
};