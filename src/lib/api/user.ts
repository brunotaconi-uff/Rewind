import { apiGet, apiRequest } from "./client";

// Espelha o formato das rotas de perfil do backend (docs/api-perfil.md).

export interface ProfileStats {
  /** Álbuns diferentes que o usuário avaliou. */
  albumsRated: number;
  /** Avaliações com texto. */
  reviews: number;
  followers: number;
  following: number;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  /** Data ISO de criação da conta. */
  createdAt: string;
  stats: ProfileStats;
}

interface DataResponse<T> {
  data: T;
}

const userPath = (username: string) => `/users/${encodeURIComponent(username)}`;

export async function getUserProfile(username: string): Promise<UserProfile> {
  const response = await apiGet<DataResponse<UserProfile>>(userPath(username));
  return response.data;
}

/** Campos editáveis do perfil. Texto vazio em bio, cidade ou país apaga o valor. */
export interface ProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  city?: string;
  country?: string;
}

/** Edita o perfil do usuário logado. Lança CONFLICT se o nome de usuário já estiver em uso. */
export async function updateMyProfile(token: string, input: ProfileInput): Promise<UserProfile> {
  const response = await apiRequest<DataResponse<UserProfile>>("/users/me", { method: "PATCH", body: input, token });
  return response.data;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Envia a foto de perfil (o arquivo vai cru no corpo, com o Content-Type dele). */
export async function uploadMyAvatar(token: string, file: File): Promise<UserProfile> {
  const response = await apiRequest<DataResponse<UserProfile>>("/users/me/avatar", {
    method: "PUT",
    body: file,
    token,
  });
  return response.data;
}
