import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import type { MusicProvider } from "../src/services/music/music.types";

process.env.JWT_SECRET ??= "integration-test-secret";

const userId = "11111111-1111-4111-8111-111111111111";
const albumId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-11-10T12:00:00.000Z");

type TestUser = {
	id: string;
	name: string;
	username: string;
	email: string;
	passwordHash: string;
	bio: string | null;
	avatarUrl: string | null;
	city: string | null;
	country: string | null;
	createdAt: Date;
	updatedAt: Date;
};

let user: TestUser | null;
let review: {
	id: string;
	rating: number;
	content: string | null;
	createdAt: Date;
};
let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
let searchedQuery = "";
const originalUserMethods = {
	findFirst: prisma.user.findFirst,
	create: prisma.user.create,
	findUnique: prisma.user.findUnique,
};
const originalAlbumFindUnique = prisma.album.findUnique;
const originalReviewMethods = {
	create: prisma.review.create,
	findFirst: prisma.review.findFirst,
	update: prisma.review.update,
	aggregate: prisma.review.aggregate,
	findMany: prisma.review.findMany,
};

const fakeProvider: MusicProvider = {
	async searchAlbums(query, options) {
		searchedQuery = query;
		return [
			{
				externalId: "302127",
				title: "Discovery",
				coverUrl: null,
				releaseYear: 2001,
				totalTracks: 14,
				artists: [],
			},
		].slice(0, options?.limit);
	},
	async searchAlbumsByArtist() {
		return { artist: null, albums: [] };
	},
	async getAlbum() {
		throw new Error("getAlbum não deveria ser chamado neste teste");
	},
	async getNewReleases() {
		return [];
	},
	async searchArtists() {
		return [];
	},
};

const app = createApp(fakeProvider);

before(async () => {
	user = null;
	review = {
		id: "33333333-3333-4333-8333-333333333333",
		rating: 4.5,
		content: "Boa",
		createdAt,
	};

	Object.assign(prisma.user, {
		findFirst: async ({ where }) => {
			if (!user) return null;
			const matchesUsername = where.OR?.some(
				(entry) => "username" in entry && entry.username === user?.username,
			);
			const matchesEmail = where.OR?.some(
				(entry) => "email" in entry && entry.email === user?.email,
			);
			return matchesUsername || matchesEmail ? user : null;
		},
		create: async ({ data }) => {
			user = {
				id: userId,
				name: data.name,
				username: data.username,
				email: data.email,
				passwordHash: data.passwordHash,
				bio: data.bio ?? null,
				avatarUrl: data.avatarUrl ?? null,
				city: data.city ?? null,
				country: data.country ?? null,
				createdAt,
				updatedAt: createdAt,
			};
			return user;
		},
		findUnique: async ({ where }) => {
			if (!user) return null;
			return ("email" in where && where.email === user.email) ||
				("id" in where && where.id === user.id)
				? user
				: null;
		},
	});
	Object.assign(prisma.album, {
		findUnique: async () => ({ id: albumId }),
	});
	Object.assign(prisma.review, {
		create: async ({ data }) => {
			review = {
				...review,
				rating: Number(data.rating),
				content: data.content ?? null,
			};
			return review;
		},
		findFirst: async () => ({ id: review.id }),
		update: async ({ data }) => {
			review = {
				...review,
				rating: data.rating === undefined ? review.rating : Number(data.rating),
				content: data.content === undefined ? review.content : data.content,
			};
			return review;
		},
		aggregate: async () => ({
			_avg: { rating: review.rating },
			_count: { _all: 1 },
		}),
		findMany: async () => [
			{
				...review,
				user: { id: userId, name: "Ana", username: "ana", avatarUrl: null },
			},
		],
	});

	server = app.listen(0);
	await once(server, "listening");
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
	prisma.user.findFirst = originalUserMethods.findFirst;
	prisma.user.create = originalUserMethods.create;
	prisma.user.findUnique = originalUserMethods.findUnique;
	prisma.album.findUnique = originalAlbumFindUnique;
	prisma.review.create = originalReviewMethods.create;
	prisma.review.findFirst = originalReviewMethods.findFirst;
	prisma.review.update = originalReviewMethods.update;
	prisma.review.aggregate = originalReviewMethods.aggregate;
	prisma.review.findMany = originalReviewMethods.findMany;
	if (server) {
		server.close();
		await once(server, "close");
	}
});

test("cadastro, login e rota autenticada de usuário", async () => {
	const registration = await fetch(`${baseUrl}/users`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			name: "Ana",
			username: "ana",
			email: "ana@example.test",
			password: "senha-segura",
		}),
	});
	assert.equal(registration.status, 201);
	const registeredUser = (await registration.json()) as {
		id: string;
		email: string;
	};
	assert.equal(registeredUser.email, "ana@example.test");
	assert.equal(registeredUser.id, userId);

	const login = await fetch(`${baseUrl}/users/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			email: "ana@example.test",
			password: "senha-segura",
		}),
	});
	assert.equal(login.status, 200);
	const loginResult = (await login.json()) as { token: string };
	assert.ok(loginResult.token);

	const me = await fetch(`${baseUrl}/users/me`, {
		headers: { authorization: `Bearer ${loginResult.token}` },
	});
	assert.equal(me.status, 200);
	assert.equal(((await me.json()) as { username: string }).username, "ana");
});

test("busca de álbuns responde com provider simulado, sem chamar a Deezer", async () => {
	const response = await fetch(
		`${baseUrl}/albums/search?q=  daft%20punk  &limit=1`,
	);

	assert.equal(response.status, 200);
	assert.equal(searchedQuery, "daft punk");
	assert.deepEqual(await response.json(), {
		data: [
			{
				externalId: "302127",
				title: "Discovery",
				coverUrl: null,
				releaseYear: 2001,
				totalTracks: 14,
				artists: [],
			},
		],
	});
});

test("cria, edita e consulta avaliações", async () => {
	const login = await fetch(`${baseUrl}/users/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			email: "ana@example.test",
			password: "senha-segura",
		}),
	});
	const { token } = (await login.json()) as { token: string };

	const unauthenticated = await fetch(`${baseUrl}/albums/302127/reviews`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ rating: 4 }),
	});
	assert.equal(unauthenticated.status, 401);

	const created = await fetch(`${baseUrl}/albums/302127/reviews`, {
		method: "POST",
		headers: {
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({ rating: 4.5, content: "Boa" }),
	});
	assert.equal(created.status, 201);
	assert.equal(
		((await created.json()) as { data: { rating: number } }).data.rating,
		4.5,
	);

	const updated = await fetch(`${baseUrl}/albums/302127/reviews/${review.id}`, {
		method: "PATCH",
		headers: {
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({ rating: 5, content: "Excelente" }),
	});
	assert.equal(updated.status, 200);
	assert.deepEqual(
		((await updated.json()) as { data: { rating: number; content: string } })
			.data,
		{
			id: review.id,
			rating: 5,
			content: "Excelente",
			createdAt: createdAt.toISOString(),
			albumRating: { albumId: "302127", averageRating: 5, ratingsCount: 1 },
		},
	);

	const rating = await fetch(`${baseUrl}/albums/302127/rating`);
	assert.deepEqual(await rating.json(), {
		data: { albumId: "302127", averageRating: 5, ratingsCount: 1 },
	});

	const reviews = await fetch(`${baseUrl}/albums/302127/reviews`);
	const reviewResult = (await reviews.json()) as {
		data: Array<{ rating: number; content: string }>;
	};
	assert.equal(reviewResult.data[0].rating, 5);
	assert.equal(reviewResult.data[0].content, "Excelente");
});

// 5.1: erros de cadastro e login no formato padrão { error: { code, message } }.
test("cadastro e login recusam dados inválidos com erros padronizados", async () => {
	const post = (path: string, body: unknown) =>
		fetch(`${baseUrl}${path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
	const errorCode = async (response: Response) =>
		((await response.json()) as { error: { code: string } }).error.code;

	const duplicated = await post("/users", {
		name: "Ana",
		username: "outra",
		email: "ana@example.test",
		password: "senha-segura",
	});
	assert.equal(duplicated.status, 409);
	assert.equal(await errorCode(duplicated), "CONFLICT");

	const reserved = await post("/users", {
		name: "Ana",
		username: "me",
		email: "nova@example.test",
		password: "senha-segura",
	});
	assert.equal(reserved.status, 400);
	assert.equal(await errorCode(reserved), "VALIDATION_ERROR");

	const shortPassword = await post("/users", {
		name: "Ana",
		username: "nova",
		email: "nova@example.test",
		password: "123",
	});
	assert.equal(shortPassword.status, 400);
	assert.equal(await errorCode(shortPassword), "VALIDATION_ERROR");

	const wrongPassword = await post("/users/login", {
		email: "ana@example.test",
		password: "errada",
	});
	assert.equal(wrongPassword.status, 401);
	assert.equal(await errorCode(wrongPassword), "UNAUTHORIZED");

	// E-mail com maiúsculas entra na mesma conta; "lembrar conta" estende o token para 30 dias.
	const remembered = await post("/users/login", {
		email: "ANA@example.test",
		password: "senha-segura",
		rememberMe: true,
	});
	assert.equal(remembered.status, 200);
	const { expiresAt } = (await remembered.json()) as { expiresAt: string };
	const daysValid =
		(Date.parse(expiresAt) - Date.now()) / (24 * 60 * 60 * 1000);
	assert.ok(daysValid > 29 && daysValid <= 30);

	const noToken = await fetch(`${baseUrl}/users/me`);
	assert.equal(noToken.status, 401);
	assert.equal(await errorCode(noToken), "UNAUTHORIZED");
});

// 5.4: regras da avaliação (critérios de aceite do card).
test("avaliação: nota obrigatória, álbum gravado na primeira avaliação e uma por usuário", async () => {
	const login = await fetch(`${baseUrl}/users/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			email: "ana@example.test",
			password: "senha-segura",
		}),
	});
	const { token } = (await login.json()) as { token: string };
	const postReview = (externalId: string, body: unknown) =>
		fetch(`${baseUrl}/albums/${externalId}/reviews`, {
			method: "POST",
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		});
	const errorOf = async (response: Response) =>
		((await response.json()) as { error: { code: string; message: string } })
			.error;

	// B3: resenha sem nota é recusada com mensagem própria.
	const withoutRating = await postReview("302127", { content: "Só o texto" });
	assert.equal(withoutRating.status, 400);
	assert.deepEqual(await errorOf(withoutRating), {
		code: "VALIDATION_ERROR",
		message: "Dê uma nota para publicar a resenha.",
	});

	const invalidRating = await postReview("302127", { rating: 6 });
	assert.equal(invalidRating.status, 400);

	// Só a nota é aceita; a resenha é opcional.
	const onlyRating = await postReview("302127", { rating: 3 });
	assert.equal(onlyRating.status, 201);
	const onlyRatingBody = (await onlyRating.json()) as {
		data: {
			rating: number;
			content: string | null;
			albumRating: { averageRating: number };
		};
	};
	assert.equal(onlyRatingBody.data.rating, 3);
	assert.equal(onlyRatingBody.data.content, null);
	// B5: a resposta já traz a média recalculada.
	assert.equal(onlyRatingBody.data.albumRating.averageRating, 3);

	// B4: álbum que ainda não está no banco é gravado com título, capa e artistas.
	const albumMethods = {
		findUnique: prisma.album.findUnique,
		create: prisma.album.create,
	};
	const originalGetAlbum = fakeProvider.getAlbum;
	let savedAlbum: { title: string; coverUrl: string | null } | undefined;
	Object.assign(prisma.album, {
		findUnique: async () => null,
		create: async ({
			data,
		}: {
			data: { title: string; coverUrl: string | null };
		}) => {
			savedAlbum = data;
			return { id: albumId };
		},
	});
	fakeProvider.getAlbum = async (externalId) => ({
		externalId,
		title: "Random Access Memories",
		coverUrl: "https://example.test/ram.jpg",
		releaseYear: 2013,
		totalTracks: 13,
		artists: [{ externalId: "27", name: "Daft Punk", imageUrl: null }],
		releaseDate: "2013-05-17",
		durationMs: 4_464_000,
		tracks: [],
	});
	try {
		const newAlbum = await postReview("6575789", {
			rating: 4,
			content: "Ótimo",
		});
		assert.equal(newAlbum.status, 201);
		assert.equal(savedAlbum?.title, "Random Access Memories");
		assert.equal(savedAlbum?.coverUrl, "https://example.test/ram.jpg");
	} finally {
		Object.assign(prisma.album, albumMethods);
		fakeProvider.getAlbum = originalGetAlbum;
	}

	// B1: segunda avaliação do mesmo álbum pelo mesmo usuário é recusada.
	const reviewCreate = prisma.review.create;
	Object.assign(prisma.review, {
		create: async () => {
			throw Object.assign(new Error("Unique constraint failed"), {
				code: "P2002",
			});
		},
	});
	try {
		const duplicated = await postReview("302127", { rating: 2 });
		assert.equal(duplicated.status, 409);
		assert.equal((await errorOf(duplicated)).code, "CONFLICT");
	} finally {
		prisma.review.create = reviewCreate;
	}

	// F4 usa esta rota para abrir o modal preenchido.
	const myReviewWithoutLogin = await fetch(
		`${baseUrl}/albums/302127/reviews/me`,
	);
	assert.equal(myReviewWithoutLogin.status, 401);

	const reviewFindFirst = prisma.review.findFirst;
	const getMyReview = async () => {
		const response = await fetch(`${baseUrl}/albums/302127/reviews/me`, {
			headers: { authorization: `Bearer ${token}` },
		});
		assert.equal(response.status, 200);
		return (
			(await response.json()) as {
				data: { rating: number; content: string | null } | null;
			}
		).data;
	};
	try {
		Object.assign(prisma.review, { findFirst: async () => review });
		assert.deepEqual(await getMyReview(), {
			id: review.id,
			rating: review.rating,
			content: review.content,
			createdAt: createdAt.toISOString(),
		});

		Object.assign(prisma.review, { findFirst: async () => null });
		assert.equal(await getMyReview(), null);
	} finally {
		prisma.review.findFirst = reviewFindFirst;
	}
});
