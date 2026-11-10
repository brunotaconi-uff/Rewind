import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { AuthRequest } from "../middleware/auth.middleware";
import { addFavoriteService, listFavoritesService, removeFavoriteService } from "../services/favorite.service";

function readAlbumId(value: unknown): string {
  const albumId = typeof value === "string" ? value.trim() : "";
  if (!albumId || albumId.length > 64) throw AppError.validation('Informe o álbum no campo "albumId".');
  return albumId;
}

export const listFavorites = async (req: Request<{ username: string }>, res: Response) => {
  res.json({ data: await listFavoritesService(req.params.username) });
};

export const addFavorite = async (req: AuthRequest, res: Response) => {
  const albumId = readAlbumId(req.body?.albumId);
  res.status(201).json({ data: await addFavoriteService(req.userId!, albumId) });
};

export const removeFavorite = async (req: AuthRequest, res: Response) => {
  await removeFavoriteService(req.userId!, readAlbumId(req.params.albumId));
  res.status(204).end();
};
