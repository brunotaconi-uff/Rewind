import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";

// As fotos ficam em backend/uploads/avatars e são servidas em /uploads (ver server.ts).
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");
const AVATARS_URL_PATH = "/uploads/avatars/";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type ImageExtension = "jpg" | "png" | "webp" | "gif";

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

/** Apaga a foto anterior se ela foi enviada para este servidor (ignora URLs externas). */
async function removeOldAvatar(avatarUrl: string | null) {
  if (!avatarUrl) return;
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
  await mkdir(AVATARS_DIR, { recursive: true });
  await writeFile(path.join(AVATARS_DIR, fileName), file);

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: `${baseUrl}${AVATARS_URL_PATH}${fileName}` },
  });
  await removeOldAvatar(user.avatarUrl);
};
