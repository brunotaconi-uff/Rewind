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
let followExists = false;
const originalUserMethods = {
	findFirst: prisma.user.findFirst,
	create: prisma.user.create,
	findUnique: prisma.user.findUnique,
};
const originalAlbumFindUnique = prisma.album.findUnique;
const originalFollowFindUnique = prisma.follow.findUnique;
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
	Object.assign(prisma.follow, {
		findUnique: async () => (followExists ? { followerId: userId } : null),
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
	prisma.follow.findUnique = originalFollowFindUnique;
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

	followExists = true;
	const followStatus = await fetch(`${baseUrl}/users/44444444-4444-4444-8444-444444444444/follow`, {
		headers: { authorization: `Bearer ${loginResult.token}` },
	});
	assert.equal(followStatus.status, 200);
	assert.deepEqual(await followStatus.json(), { data: { following: true } });

	const selfFollow = await fetch(`${baseUrl}/users/${userId}/follow`, {
		method: "POST",
		headers: { authorization: `Bearer ${loginResult.token}` },
	});
	assert.equal(selfFollow.status, 400);
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
