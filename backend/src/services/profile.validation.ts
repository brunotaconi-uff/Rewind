import { AppError } from "../errors/AppError";

export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;

// "me" é o caminho de /users/me; um usuário com esse nome teria o perfil inacessível.
const RESERVED_USERNAMES = ["me"];

const LIMITS = { name: 60, bio: 300, city: 60, country: 60 } as const;

export interface ProfileUpdate {
  name?: string;
  username?: string;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
}

function readText(body: Record<string, unknown>, field: keyof typeof LIMITS, label: string): string | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value !== null && typeof value !== "string") throw AppError.validation(`${label} inválido.`);

  const text = (value ?? "").trim();
  if (text.length > LIMITS[field]) {
    throw AppError.validation(`${label} deve ter no máximo ${LIMITS[field]} caracteres.`);
  }
  return text;
}

/** Valida o corpo do PATCH /users/me. Só os campos enviados são alterados. */
export function parseProfileUpdate(body: unknown): ProfileUpdate {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw AppError.validation("Envie os dados do perfil em JSON.");
  }
  const input = body as Record<string, unknown>;
  const update: ProfileUpdate = {};

  const name = readText(input, "name", "Nome");
  if (name !== undefined) {
    if (!name) throw AppError.validation("O nome não pode ficar vazio.");
    update.name = name;
  }

  if (input.username !== undefined) {
    const username = typeof input.username === "string" ? input.username.trim() : "";
    if (!USERNAME_PATTERN.test(username)) {
      throw AppError.validation(
        "O nome de usuário deve ter de 3 a 30 caracteres: letras, números, ponto ou sublinhado.",
      );
    }
    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      throw AppError.validation("Esse nome de usuário não pode ser usado.");
    }
    update.username = username;
  }

  // Campos opcionais: texto vazio apaga o valor.
  for (const [field, label] of [["bio", "Bio"], ["city", "Cidade"], ["country", "País"]] as const) {
    const text = readText(input, field, label);
    if (text !== undefined) update[field] = text || null;
  }

  return update;
}
