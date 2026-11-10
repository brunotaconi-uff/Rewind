// Ponto único que escolhe a fonte de música. Para trocar de fonte:
// crie um provider em ./providers que implemente MusicProvider,
// registre-o abaixo e mude MUSIC_PROVIDER no .env.

import { env } from "../../config/env";
import type { MusicProvider } from "./music.types";
import { CachedMusicProvider } from "./providers/cached.provider";
import { DeezerProvider } from "./providers/deezer.provider";

function createBaseProvider(name: string): MusicProvider {
  switch (name) {
    case "deezer":
      return new DeezerProvider({
        baseUrl: process.env.DEEZER_API_URL,
        timeoutMs: env.musicApiTimeoutMs,
      });
    default:
      throw new Error(`MUSIC_PROVIDER desconhecido: "${name}". Opções: deezer.`);
  }
}

export function createMusicProvider(): MusicProvider {
  const provider = createBaseProvider(env.musicProvider);
  if (env.musicCacheTtlSeconds === 0) return provider;
  return new CachedMusicProvider(provider, { ttlMs: env.musicCacheTtlSeconds * 1000 });
}

let sharedProvider: MusicProvider | undefined;

/** Instância única usada pelas rotas, para todas compartilharem o mesmo cache. */
export function getMusicProvider(): MusicProvider {
  sharedProvider ??= createMusicProvider();
  return sharedProvider;
}
