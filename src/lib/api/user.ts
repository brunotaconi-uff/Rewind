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
