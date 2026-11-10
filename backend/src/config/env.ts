import "dotenv/config";

function readNumber(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`Variável de ambiente ${name} inválida: "${raw}" (mínimo ${min}).`);
  }
  return value;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Variável de ambiente JWT_SECRET não definida.");
  }
  return secret;
}

export const env = {
  /** Qual provider de música usar. Ver services/music/music.provider.ts. */
  musicProvider: process.env.MUSIC_PROVIDER || "deezer",
  musicApiTimeoutMs: readNumber("MUSIC_API_TIMEOUT_MS", 5000, 1),
  /** 0 desliga o cache em memória. */
  musicCacheTtlSeconds: readNumber("MUSIC_CACHE_TTL_SECONDS", 600, 0),
};
