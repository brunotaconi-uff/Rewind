import { apiGet, apiRequest } from "./client";

export interface AlbumRating {
	albumId: string;
	/** null quando o álbum ainda não tem avaliações. */
	averageRating: number | null;
	ratingsCount: number;
}

interface DataResponse<T> {
	data: T;
}

export async function getAlbumRating(externalId: string): Promise<AlbumRating> {
	const response = await apiGet<DataResponse<AlbumRating>>(
		`/albums/${encodeURIComponent(externalId)}/rating`,
	);
	return response.data;
}

export interface ReviewAuthor {
	id: string;
	name: string;
	username: string;
	avatarUrl: string | null;
}

/** Resenha (avaliação com texto) como a rota /albums/:id/reviews devolve. */
export interface AlbumReview {
	id: string;
	rating: number;
	content: string;
	/** Data ISO (ex.: "2026-10-05T14:30:00.000Z"). */
	createdAt: string;
	user: ReviewAuthor;
}

/** Resenhas do álbum, das mais recentes para as mais antigas. */
export async function getAlbumReviews(
	externalId: string,
): Promise<AlbumReview[]> {
	const response = await apiGet<DataResponse<AlbumReview[]>>(
		`/albums/${encodeURIComponent(externalId)}/reviews`,
	);
	return response.data;
}

/** Avaliação do usuário logado (5.4): nota de 0,5 a 5 e resenha opcional. */
export interface MyReview {
	id: string;
	rating: number;
	content: string | null;
	createdAt: string;
}

export interface ReviewInput {
	rating: number;
	/** null ou vazio = avaliação só com a nota. */
	content: string | null;
}

/** Resposta de criar/editar: a avaliação salva e a média já recalculada. */
export interface SavedReview extends MyReview {
	albumRating: AlbumRating;
}

const reviewsPath = (externalId: string) =>
	`/albums/${encodeURIComponent(externalId)}/reviews`;

/** Avaliação do usuário para este álbum, ou null se ele ainda não avaliou. */
export async function getMyReview(
	token: string,
	externalId: string,
): Promise<MyReview | null> {
	const response = await apiRequest<DataResponse<MyReview | null>>(
		`${reviewsPath(externalId)}/me`,
		{ token },
	);
	return response.data;
}

export async function createReview(
	token: string,
	externalId: string,
	input: ReviewInput,
): Promise<SavedReview> {
	const response = await apiRequest<DataResponse<SavedReview>>(
		reviewsPath(externalId),
		{
			method: "POST",
			body: input,
			token,
		},
	);
	return response.data;
}

export async function updateReview(
	token: string,
	externalId: string,
	reviewId: string,
	input: ReviewInput,
): Promise<SavedReview> {
	const response = await apiRequest<DataResponse<SavedReview>>(
		`${reviewsPath(externalId)}/${encodeURIComponent(reviewId)}`,
		{ method: "PATCH", body: input, token },
	);
	return response.data;
}
