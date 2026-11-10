import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { getMusicProvider } from "./music/music.provider";
import type { ExternalAlbumSummary, MusicProvider } from "./music/music.types";

// Álbum resumido igual ao das rotas de música (ExternalAlbumSummary),
// para o front reaproveitar os mesmos componentes de card.
const albumSummarySelect = {
  externalId: true,
  title: true,
  coverUrl: true,
  releaseYear: true,
  totalTracks: true,
  artists: { select: { artist: { select: { externalId: true, name: true, imageUrl: true } } } },
} as const;

type AlbumSummaryRow = {
  externalId: string;
  title: string;
  coverUrl: string | null;
  releaseYear: number | null;
  totalTracks: number;
  artists: { artist: { externalId: string; name: string; imageUrl: string | null } }[];
};

export function toAlbumSummary(album: AlbumSummaryRow): ExternalAlbumSummary {
  return { ...album, artists: album.artists.map(({ artist }) => artist) };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Devolve o id interno do álbum, gravando-o no banco na primeira vez
 * (com os artistas) a partir da API de música.
 */
async function ensureAlbum(externalId: string, provider: MusicProvider): Promise<string> {
  const saved = await prisma.album.findUnique({ where: { externalId }, select: { id: true } });
  if (saved) return saved.id;

  // Lança NOT_FOUND se o álbum não existir na fonte.
  const album = await provider.getAlbum(externalId);
  const artists = [...new Map(album.artists.map((artist) => [artist.externalId, artist])).values()];

  try {
    const created = await prisma.album.create({
      data: {
        externalId: album.externalId,
        title: album.title,
        coverUrl: album.coverUrl,
        releaseYear: album.releaseYear,
        totalTracks: album.totalTracks,
        artists: {
          create: artists.map((artist) => ({
            artist: {
              connectOrCreate: {
                where: { externalId: artist.externalId },
                create: artist,
              },
            },
          })),
        },
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    // Outra requisição gravou o mesmo álbum ao mesmo tempo.
    if (!isUniqueViolation(error)) throw error;
    const existing = await prisma.album.findUniqueOrThrow({ where: { externalId }, select: { id: true } });
    return existing.id;
  }
}

/** 5.2-B4: favoritos do usuário, os adicionados por último primeiro. */
export const listFavoritesService = async (username: string) => {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw AppError.notFound("Usuário não encontrado.");

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { album: { select: albumSummarySelect } },
  });
  return favorites.map(({ album }) => toAlbumSummary(album));
};

/** 5.2-B4: adiciona aos favoritos. Favoritar de novo o mesmo álbum não dá erro. */
export const addFavoriteService = async (
  userId: string,
  externalId: string,
  provider: MusicProvider = getMusicProvider(),
) => {
  const albumId = await ensureAlbum(externalId, provider);

  await prisma.favorite.upsert({
    where: { userId_albumId: { userId, albumId } },
    create: { userId, albumId },
    update: {},
  });

  const album = await prisma.album.findUniqueOrThrow({ where: { id: albumId }, select: albumSummarySelect });
  return toAlbumSummary(album);
};

/** 5.2-B4: remove dos favoritos. Remover um álbum que não está lá não dá erro. */
export const removeFavoriteService = async (userId: string, externalId: string) => {
  await prisma.favorite.deleteMany({ where: { userId, album: { externalId } } });
};
