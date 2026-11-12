import { prisma } from "../lib/prisma";
import type { MusicProvider } from "./music/music.types";

export function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

/**
 * Devolve o id interno do álbum, gravando-o no banco na primeira vez
 * (título, capa, ano e artistas) a partir da API de música.
 * Usado pelos favoritos (5.2) e pelas avaliações (5.4).
 */
export async function ensureAlbum(
	externalId: string,
	provider: MusicProvider,
): Promise<string> {
	const saved = await prisma.album.findUnique({
		where: { externalId },
		select: { id: true },
	});
	if (saved) return saved.id;

	// Lança NOT_FOUND se o álbum não existir na fonte.
	const album = await provider.getAlbum(externalId);
	const artists = [
		...new Map(
			album.artists.map((artist) => [artist.externalId, artist]),
		).values(),
	];

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
		const existing = await prisma.album.findUniqueOrThrow({
			where: { externalId },
			select: { id: true },
		});
		return existing.id;
	}
}
