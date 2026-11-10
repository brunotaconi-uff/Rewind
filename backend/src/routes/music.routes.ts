import { Router } from "express";
import { AppError } from "../errors/AppError";
import { getMusicProvider } from "../services/music/music.provider";
import type { MusicProvider } from "../services/music/music.types";

const MAX_LIMIT = 50;

function readQuery(value: unknown): string {
  const query = typeof value === "string" ? value.trim() : "";
  if (!query) throw AppError.validation('Informe o termo de busca no parâmetro "q".');
  return query;
}

function readLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw AppError.validation(`O parâmetro "limit" deve ser um inteiro entre 1 e ${MAX_LIMIT}.`);
  }
  return limit;
}

// Recebe o provider por parâmetro para os testes injetarem um falso.
// O Express 5 encaminha erros de handlers async para o error.middleware.
export function createMusicRouter(provider: MusicProvider): Router {
  const router = Router();

  // 4.2-B1: álbuns pelo nome.
  router.get("/albums/search", async (req, res) => {
    const query = readQuery(req.query.q);
    const limit = readLimit(req.query.limit);
    res.json({ data: await provider.searchAlbums(query, { limit }) });
  });

  // 4.2-B2: álbuns pelo nome do artista. Devolve { artist, albums }.
  router.get("/albums/search/by-artist", async (req, res) => {
    const query = readQuery(req.query.q);
    const limit = readLimit(req.query.limit);
    res.json({ data: await provider.searchAlbumsByArtist(query, { limit }) });
  });

  // Declarada antes de /albums/:externalId para não ser capturada por ela.
  router.get("/albums/new-releases", async (req, res) => {
    const limit = readLimit(req.query.limit);
    res.json({ data: await provider.getNewReleases({ limit }) });
  });

  router.get("/albums/:externalId", async (req, res) => {
    res.json({ data: await provider.getAlbum(req.params.externalId) });
  });

  router.get("/artists/search", async (req, res) => {
    const query = readQuery(req.query.q);
    const limit = readLimit(req.query.limit);
    res.json({ data: await provider.searchArtists(query, { limit }) });
  });

  return router;
}

export default createMusicRouter(getMusicProvider());
