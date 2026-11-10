import { apiGet } from "./client";

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
