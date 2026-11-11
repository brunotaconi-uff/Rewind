import { del, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";

// Onde as fotos ficam:
// - com um Blob conectado (deploy na Vercel): no Vercel Blob, porque lá o disco é
//   temporário e o express.static não serve arquivos. A Vercel define BLOB_STORE_ID e o
//   SDK se autentica sozinho (OIDC); BLOB_READ_WRITE_TOKEN também serve, se existir;
// - sem nenhum dos dois (desenvolvimento local): em backend/uploads/avatars, servidas em /uploads (ver app.ts).
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");
const AVATARS_URL_PATH = "/uploads/avatars/";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type ImageExtension = "jpg" | "png" | "webp" | "gif";

const CONTENT_TYPES: Record<ImageExtension, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function usesBlobStorage(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Descobre o formato pelos primeiros bytes do arquivo, sem confiar no Content-Type. */
export function detectImageType(file: Buffer): ImageExtension | null {
  if (file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff) return "jpg";
  if (file.length >= 8 && file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (file.length >= 12 && file.toString("ascii", 0, 4) === "RIFF" && file.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  if (file.length >= 6 && ["GIF87a", "GIF89a"].includes(file.toString("ascii", 0, 6))) return "gif";
  return null;
}

/** Guarda a foto e devolve a URL pública dela. */
async function storeAvatar(fileName: string, file: Buffer, extension: ImageExtension, baseUrl: string) {
  if (usesBlobStorage()) {
    const blob = await put(`avatars/${fileName}`, file, { access: "public", contentType: CONTENT_TYPES[extension] });
    return blob.url;
  }

  await mkdir(AVATARS_DIR, { recursive: true });
  await writeFile(path.join(AVATARS_DIR, fileName), file);
  return `${baseUrl}${AVATARS_URL_PATH}${fileName}`;
}

/** Apaga a foto anterior se ela foi enviada por este backend (ignora URLs externas). */
async function removeOldAvatar(avatarUrl: string | null) {
  if (!avatarUrl) return;
  if (isBlobUrl(avatarUrl)) {
    if (usesBlobStorage()) await del(avatarUrl).catch(() => undefined);
    return;
  }

  const index = avatarUrl.indexOf(AVATARS_URL_PATH);
  if (index === -1) return;

  const fileName = path.basename(avatarUrl.slice(index + AVATARS_URL_PATH.length));
  await unlink(path.join(AVATARS_DIR, fileName)).catch(() => undefined);
}

/**
 * 5.2-B3: guarda a foto de perfil e atualiza o avatarUrl do usuário.
 * `baseUrl` é o endereço público do backend (ex.: http://localhost:3001).
 */
export const saveAvatarService = async (userId: string, file: unknown, baseUrl: string) => {
  if (!Buffer.isBuffer(file) || file.length === 0) {
    throw AppError.validation("Envie a foto no corpo da requisição, com o Content-Type da imagem.");
  }

  const extension = detectImageType(file);
  if (!extension) throw AppError.validation("A foto deve ser JPG, PNG, WEBP ou GIF.");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  if (!user) throw AppError.notFound("Usuário não encontrado.");

  // Nome novo a cada envio para o navegador não mostrar a foto antiga do cache.
  const fileName = `${userId}-${randomUUID()}.${extension}`;
  const avatarUrl = await storeAvatar(fileName, file, extension, baseUrl);

  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  await removeOldAvatar(user.avatarUrl);
};
