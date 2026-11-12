import { apiGet, apiRequest } from "./client";
import type { AlbumSummary } from "./music";

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

export interface UserSearchResult {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface FeedAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

interface DataResponse<T> {
  data: T;
}

const userPath = (username: string) => `/users/${encodeURIComponent(username)}`;

export async function getUserProfile(username: string): Promise<UserProfile> {
  const response = await apiGet<DataResponse<UserProfile>>(userPath(username));
  return response.data;
}

export async function searchUsers(token: string, username: string): Promise<UserSearchResult[]> {
  const query = encodeURIComponent(username);
  const response = await apiRequest<DataResponse<UserSearchResult[]>>(`/users/search?username=${query}`, { token });
  return response.data;
}

export async function getFollowStatus(token: string, userId: string): Promise<boolean> {
  const response = await apiRequest<DataResponse<{ following: boolean }>>(
    `/users/${encodeURIComponent(userId)}/follow`,
    { token },
  );
  return response.data.following;
}

export async function followUser(token: string, userId: string): Promise<void> {
  await apiRequest<DataResponse<{ following: boolean }>>(`/users/${encodeURIComponent(userId)}/follow`, {
    method: "POST",
    token,
  });
}

export async function unfollowUser(token: string, userId: string): Promise<void> {
  await apiRequest<DataResponse<{ following: boolean }>>(`/users/${encodeURIComponent(userId)}/follow`, {
    method: "DELETE",
    token,
  });
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

/** Favoritos do usuário, os adicionados por último primeiro. */
export async function getUserFavorites(username: string): Promise<AlbumSummary[]> {
  const response = await apiGet<DataResponse<AlbumSummary[]>>(`${userPath(username)}/favorites`);
  return response.data;
}

/** albumId é o externalId do álbum (o mesmo das rotas de música). */
export async function addFavorite(token: string, albumId: string): Promise<AlbumSummary> {
  const response = await apiRequest<DataResponse<AlbumSummary>>("/users/me/favorites", {
    method: "POST",
    body: { albumId },
    token,
  });
  return response.data;
}

export async function removeFavorite(token: string, albumId: string): Promise<void> {
  await apiRequest<null>(`/users/me/favorites/${encodeURIComponent(albumId)}`, { method: "DELETE", token });
}

/** Nota ou resenha do usuário, como a rota /users/:username/feed devolve. */
export interface FeedItem {
  id: string;
  rating: number;
  /** null = só nota, sem resenha. */
  content: string | null;
  /** Data ISO. */
  createdAt: string;
  album: AlbumSummary;
  user?: FeedAuthor;
}

/** Notas e resenhas do usuário, das mais recentes para as mais antigas. */
export async function getUserFeed(username: string, limit?: number): Promise<FeedItem[]> {
  const query = limit ? `?limit=${limit}` : "";
  const response = await apiGet<DataResponse<FeedItem[]>>(`${userPath(username)}/feed${query}`);
  return response.data;
}

/** Notas e resenhas das pessoas seguidas, das mais recentes para as mais antigas. */
export async function getFollowingFeed(token: string, limit?: number): Promise<FeedItem[]> {
  const query = limit ? `?limit=${limit}` : "";
  const response = await apiRequest<DataResponse<FeedItem[]>>(`/users/feed${query}`, { token });
  return response.data;
}
