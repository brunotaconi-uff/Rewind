import assert from "node:assert/strict";
import { once } from "node:events";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { after, afterEach, before, describe, mock, test } from "node:test";
import type { AddressInfo } from "node:net";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app";
import { ExternalApiError, AppError } from "../src/errors/AppError";
import { prisma } from "../src/lib/prisma";
import { UPLOADS_DIR } from "../src/services/avatar.service";
import type { MusicProvider } from "../src/services/music/music.types";

process.env.JWT_SECRET ??= "routes-test-secret";
const SECRET = process.env.JWT_SECRET!;

// ---------- Dados de apoio ----------
const USER_ID = "11111111-1111-4111-8111-111111111111";
const ALBUM_ID = "22222222-2222-4222-8222-222222222222";
const REVIEW_ID = "33333333-3333-4333-8333-333333333333";
const EXTERNAL_ALBUM = "302127";
const CREATED_AT = new Date("2026-11-10T12:00:00.000Z");
const PASSWORD = "senha-segura";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  name: "Ana",
  username: "ana",
  email: "ana@example.test",
  passwordHash: PASSWORD_HASH,
  bio: null,
  avatarUrl: null,
  city: null,
  country: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides,
});

const PUBLIC_USER = {
  id: USER_ID, name: "Ana", username: "ana", bio: null,
  avatarUrl: null, city: null, country: null, createdAt: CREATED_AT,
};

const ALBUM_ROW = {
  externalId: EXTERNAL_ALBUM, title: "Discovery", coverUrl: null, releaseYear: 2001, totalTracks: 14,
  artists: [{ artist: { externalId: "27", name: "Daft Punk", imageUrl: null } }],
};
const ALBUM_SUMMARY = {
  externalId: EXTERNAL_ALBUM, title: "Discovery", coverUrl: null, releaseYear: 2001, totalTracks: 14,
  artists: [{ externalId: "27", name: "Daft Punk", imageUrl: null }],
};

const tokenFor = (userId = USER_ID) => jwt.sign({ userId }, SECRET, { expiresIn: "1h" });

// ---------- Infra: servidor, provider falso e stubs do Prisma ----------
let provider: Partial<MusicProvider> = {};
// Delega para o `provider` atual, que cada teste troca conforme precisa.
const fakeProvider = new Proxy({} as MusicProvider, {
  get: (_t, name: string) => (...args: unknown[]) => {
    const fn = (provider as Record<string, (...a: unknown[]) => unknown>)[name];
    if (!fn) throw new Error(`provider.${name} não foi configurado neste teste`);
    return fn(...args);
  },
});

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
const restores: Array<() => void> = [];

function stub(target: any, key: string, impl: (...args: any[]) => unknown) {
  const original = target[key];
  target[key] = impl;
  restores.push(() => { target[key] = original; });
}

async function api(
  url: string,
  opts: { method?: string; token?: string; body?: unknown; raw?: Buffer | string; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: any;
  if (opts.raw !== undefined) body = opts.raw;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${baseUrl}${url}`, { method: opts.method ?? "GET", headers, body });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
}

// Linhas do Prisma sem curtidas (6.3): o select de likes vem junto em feed e resenhas.
const NO_LIKES = { _count: { likes: 0 }, likes: [] };

function stubAlbumRating() {
  stub(prisma.review, "aggregate", async () => ({ _avg: { rating: null }, _count: { _all: 0 } }));
}

function stubProfileStats() {
  stub(prisma.review, "findMany", async () => [{ albumId: "a" }, { albumId: "b" }]);
  stub(prisma.review, "count", async () => 7);
  stub(prisma.follow, "count", async ({ where }: any) => ("followingId" in where ? 10 : 3));
}

before(async () => {
  // O backend loga erros esperados; silenciamos para a saída dos testes ficar limpa.
  mock.method(console, "error", () => undefined);
  mock.method(console, "warn", () => undefined);
  server = createApp(fakeProvider).listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => {
  while (restores.length) restores.pop()!();
  provider = {};
});

after(async () => {
  mock.restoreAll();
  server.close();
  await once(server, "close");
});

// =====================================================================
// Geral
// =====================================================================
describe("app", () => {
  test("rota inexistente devolve 404 no formato padrão de erro", async () => {
    const res = await api("/rota-inexistente");
    assert.equal(res.status, 404);
    assert.deepEqual(res.json, {
      error: { code: "NOT_FOUND", message: "Rota GET /rota-inexistente não encontrada." },
    });
  });

    test("CORS liberado para qualquer origem", async () => {
        provider = { getNewReleases: async () => [] };
        const res = await api("/albums/new-releases", { headers: { origin: "http://localhost:3000" } });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("access-control-allow-origin"), "*");
  });
});

// =====================================================================
// Middleware de autenticação (testado via GET /users/me)
// =====================================================================
describe("authMiddleware", () => {
  test("401 sem header Authorization", async () => {
    const res = await api("/users/me");
    assert.equal(res.status, 401);
    assert.deepEqual(res.json.error, { code: "UNAUTHORIZED", message: "Token não informado." });
  });

  test("401 com header sem token ('Bearer' sozinho)", async () => {
    const res = await api("/users/me", { headers: { authorization: "Bearer" } });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.message, "Token não informado.");
  });

  test("401 com token malformado", async () => {
    const res = await api("/users/me", { token: "isso-nao-e-um-jwt" });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.message, "Sessão inválida ou expirada. Faça login novamente.");
  });

  test("401 com token expirado", async () => {
    const expired = jwt.sign({ userId: USER_ID }, SECRET, { expiresIn: -10 });
    const res = await api("/users/me", { token: expired });
    assert.equal(res.status, 401);
  });

  test("401 com token assinado por outro segredo", async () => {
    const forged = jwt.sign({ userId: USER_ID }, "outro-segredo");
    const res = await api("/users/me", { token: forged });
    assert.equal(res.status, 401);
  });

  test("401 com token válido mas sem userId no payload", async () => {
    const res = await api("/users/me", { token: jwt.sign({ foo: "bar" }, SECRET) });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.code, "UNAUTHORIZED");
  });

  test("rotas protegidas exigem token", async () => {
    const protectedRoutes: Array<[string, string]> = [
      ["POST", "/users/logout"],
      ["PATCH", "/users/me"],
      ["PUT", "/users/me/avatar"],
      ["POST", "/users/me/favorites"],
      ["DELETE", `/users/me/favorites/${EXTERNAL_ALBUM}`],
      ["POST", `/albums/${EXTERNAL_ALBUM}/reviews`],
      ["PATCH", `/albums/${EXTERNAL_ALBUM}/reviews/${REVIEW_ID}`],
    ];
    for (const [method, url] of protectedRoutes) {
      const res = await api(url, { method });
      assert.equal(res.status, 401, `${method} ${url} deveria exigir token`);
    }
  });
});

// =====================================================================
// POST /users (cadastro)
// =====================================================================
describe("POST /users", () => {
  const valid = { name: "Ana", username: "ana", email: "ana@example.test", password: PASSWORD };

  for (const missing of ["name", "username", "email", "password"]) {
    test(`400 quando falta o campo ${missing}`, async () => {
      const body: Record<string, unknown> = { ...valid };
      delete body[missing];
      const res = await api("/users", { method: "POST", body });
      assert.equal(res.status, 400);
      assert.equal(res.json.error.code, "VALIDATION_ERROR");
    });
  }

  test("409 quando o e-mail já existe", async () => {
    stub(prisma.user, "findFirst", async () => makeUser());
    const res = await api("/users", { method: "POST", body: valid });
    assert.equal(res.status, 409);
    assert.equal(res.json.error.message, "Já existe um usuário cadastrado com este e-mail.");
  });

  test("409 quando o nome de usuário já existe", async () => {
    stub(prisma.user, "findFirst", async () => makeUser({ email: "outra@example.test" }));
    const res = await api("/users", { method: "POST", body: valid });
    assert.equal(res.status, 409);
    assert.equal(res.json.error.message, "Esse nome de usuário já está em uso.");
  });

  test("201 grava a senha criptografada e não devolve o hash", async () => {
    let saved: any;
    let select: any;
    stub(prisma.user, "findFirst", async () => null);
    stub(prisma.user, "create", async (args: any) => {
      saved = args.data;
      select = args.select;
      const { passwordHash: _hash, ...visible } = makeUser({ ...args.data });
      return visible;
    });

    const res = await api("/users", { method: "POST", body: { ...valid, bio: "Oi", city: "Niterói" } });

    assert.equal(res.status, 201);
    assert.notEqual(saved.passwordHash, PASSWORD);
    assert.ok(await bcrypt.compare(PASSWORD, saved.passwordHash));
    assert.equal(res.json.email, "ana@example.test");
    assert.equal(res.json.bio, "Oi");
    assert.equal("passwordHash" in res.json, false);
    assert.equal("password" in res.json, false);
    assert.equal(select.passwordHash, undefined);
  });

  test("500 quando o banco falha", async () => {
    stub(prisma.user, "findFirst", async () => { throw new Error("db caiu"); });
    const res = await api("/users", { method: "POST", body: valid });
    assert.equal(res.status, 500);
    assert.deepEqual(res.json.error, { code: "INTERNAL_ERROR", message: "Erro interno do servidor." });
  });
});

// =====================================================================
// POST /users/login e /users/logout
// =====================================================================
describe("POST /users/login", () => {
  test("400 sem email ou senha", async () => {
    assert.equal((await api("/users/login", { method: "POST", body: { email: "a@a.com" } })).status, 400);
    assert.equal((await api("/users/login", { method: "POST", body: { password: "x" } })).status, 400);
  });

  test("401 quando o email não existe", async () => {
    stub(prisma.user, "findUnique", async () => null);
    const res = await api("/users/login", { method: "POST", body: { email: "x@x.com", password: PASSWORD } });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.message, "E-mail ou senha incorretos.");
  });

  test("401 quando a senha está errada (mesma mensagem do email inexistente)", async () => {
    stub(prisma.user, "findUnique", async () => makeUser());
    const res = await api("/users/login", { method: "POST", body: { email: "ana@example.test", password: "errada" } });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.message, "E-mail ou senha incorretos.");
  });

  test("200 devolve token e usuário sem passwordHash", async () => {
    stub(prisma.user, "findUnique", async () => makeUser());
    const res = await api("/users/login", { method: "POST", body: { email: "ana@example.test", password: PASSWORD } });
    assert.equal(res.status, 200);
    assert.equal((jwt.verify(res.json.token, SECRET) as { userId: string }).userId, USER_ID);
    assert.equal(res.json.user.username, "ana");
    assert.equal("passwordHash" in res.json.user, false);
  });

  test("rememberMe estende a validade do token de 1 para 30 dias", async () => {
    stub(prisma.user, "findUnique", async () => makeUser());
    const lifetime = async (rememberMe: boolean) => {
      const res = await api("/users/login", {
        method: "POST",
        body: { email: "ana@example.test", password: PASSWORD, rememberMe },
      });
      const { exp, iat } = jwt.decode(res.json.token) as { exp: number; iat: number };
      return exp - iat;
    };
    assert.equal(await lifetime(false), 24 * 60 * 60);
    assert.equal(await lifetime(true), 30 * 24 * 60 * 60);
  });
});

describe("POST /users/logout", () => {
  test("200 com token válido", async () => {
    const res = await api("/users/logout", { method: "POST", token: tokenFor() });
    assert.equal(res.status, 200);
    assert.equal(res.json.message, "Logout realizado com sucesso.");
  });
});

// =====================================================================
// GET /users e GET /users/me
// =====================================================================
describe("GET /users", () => {
  test("200 lista usuários", async () => {
    stub(prisma.user, "findMany", async () => [makeUser()]);
    const res = await api("/users");
    assert.equal(res.status, 200);
    assert.equal(res.json.length, 1);
  });

  test("500 quando o banco falha", async () => {
    stub(prisma.user, "findMany", async () => { throw new Error("db caiu"); });
    const res = await api("/users");
    assert.equal(res.status, 500);
    assert.equal(res.json.error.code, "INTERNAL_ERROR");
  });

  // Corrigido depois do teste: a consulta só pede campos públicos.
  test("não pede passwordHash nem email ao banco", async () => {
    let select: any;
    stub(prisma.user, "findMany", async (args: any) => { select = args.select; return []; });
    await api("/users");
    assert.equal(select.passwordHash, undefined);
    assert.equal(select.email, undefined);
  });
});

describe("GET /users/me", () => {
  test("200 devolve o usuário logado sem passwordHash", async () => {
    let select: any;
    stub(prisma.user, "findUnique", async (args: any) => {
      select = args.select;
      if (args.where.id !== USER_ID) return null;
      const { passwordHash: _hash, ...visible } = makeUser();
      return visible;
    });
    const res = await api("/users/me", { token: tokenFor() });
    assert.equal(res.status, 200);
    assert.equal(res.json.email, "ana@example.test");
    assert.equal("passwordHash" in res.json, false);
    assert.equal(select.passwordHash, undefined);
  });

  // Corrigido depois do teste: o service lança AppError.notFound.
  test("404 quando o usuário do token foi apagado", async () => {
    stub(prisma.user, "findUnique", async () => null);
    const res = await api("/users/me", { token: tokenFor() });
    assert.equal(res.status, 404);
  });
});

// =====================================================================
// Perfil: GET /users/:username, PATCH /users/me, PUT /users/me/avatar
// =====================================================================
describe("GET /users/:username", () => {
  test("404 quando o usuário não existe", async () => {
    stub(prisma.user, "findUnique", async () => null);
    const res = await api("/users/fantasma");
    assert.equal(res.status, 404);
    assert.equal(res.json.error.code, "NOT_FOUND");
  });

  test("200 devolve perfil público com contadores e nunca pede email/senha ao banco", async () => {
    let selectUsed: Record<string, boolean> = {};
    stub(prisma.user, "findUnique", async ({ select }: any) => {
      selectUsed = select;
      return PUBLIC_USER;
    });
    stubProfileStats();

    const res = await api("/users/ana");

    assert.equal(res.status, 200);
    assert.deepEqual(res.json.data.stats, { albumsRated: 2, reviews: 7, followers: 10, following: 3 });
    assert.equal(res.json.data.username, "ana");
    assert.equal(selectUsed.email, undefined);
    assert.equal(selectUsed.passwordHash, undefined);
  });

  test("/users/me não é capturada pela rota de perfil público", async () => {
    stub(prisma.user, "findUnique", async () => makeUser());
    const res = await api("/users/me", { token: tokenFor() });
    assert.equal(res.status, 200);
    assert.equal(res.json.email, "ana@example.test"); // só o getMe devolve email
  });
});

describe("PATCH /users/me", () => {
  const patch = (body: unknown) => api("/users/me", { method: "PATCH", token: tokenFor(), body });

  test("400 com JSON malformado", async () => {
    const res = await api("/users/me", {
      method: "PATCH",
      token: tokenFor(),
      raw: '{"name":',
      headers: { "content-type": "application/json" },
    });
    assert.equal(res.status, 400);
    assert.deepEqual(res.json.error, { code: "VALIDATION_ERROR", message: "JSON inválido." });
  });

  test("400 quando o corpo não é um objeto", async () => {
    assert.equal((await patch([])).status, 400);
  });

  test("400 com nome vazio ou longo demais", async () => {
    assert.equal((await patch({ name: "   " })).status, 400);
    assert.equal((await patch({ name: "a".repeat(61) })).status, 400);
  });

  test("400 com username inválido ou reservado", async () => {
    for (const username of ["ab", "com espaço", "a".repeat(31), "ana@", "me", "ME"]) {
      const res = await patch({ username });
      assert.equal(res.status, 400, `username "${username}" deveria ser recusado`);
      assert.equal(res.json.error.code, "VALIDATION_ERROR");
    }
  });

  test("409 quando o username já está em uso (sem diferenciar maiúsculas)", async () => {
    let where: any;
    stub(prisma.user, "findFirst", async (args: any) => {
      where = args.where;
      return { id: "outro" };
    });
    const res = await patch({ username: "Maria" });
    assert.equal(res.status, 409);
    assert.equal(res.json.error.code, "CONFLICT");
    assert.deepEqual(where.username, { equals: "Maria", mode: "insensitive" });
    assert.equal(where.NOT.id, USER_ID);
  });

  test("409 quando o índice único do banco barra a corrida (P2002)", async () => {
    stub(prisma.user, "findFirst", async () => null);
    stub(prisma.user, "update", async () => { throw Object.assign(new Error("unique"), { code: "P2002" }); });
    const res = await patch({ username: "maria" });
    assert.equal(res.status, 409);
  });

  test("200 atualiza só o que foi enviado, apara espaços e apaga campo vazio", async () => {
    let updateData: any;
    stub(prisma.user, "findFirst", async () => null);
    stub(prisma.user, "update", async ({ data }: any) => { updateData = data; return {}; });
    stub(prisma.user, "findUnique", async () => ({ ...PUBLIC_USER, name: "Ana Maria" }));
    stubProfileStats();

    const res = await patch({ name: "  Ana Maria ", username: "ana.maria", bio: "" });

    assert.equal(res.status, 200);
    assert.deepEqual(updateData, { name: "Ana Maria", username: "ana.maria", bio: null });
    assert.equal(res.json.data.name, "Ana Maria");
  });
});

describe("PUT /users/me/avatar", () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const put = (raw?: Buffer, contentType = "image/png") =>
    api("/users/me/avatar", { method: "PUT", token: tokenFor(), raw, headers: { "content-type": contentType } });

  test("400 sem corpo", async () => {
    assert.equal((await put(Buffer.alloc(0))).status, 400);
  });

  test("400 com Content-Type que não é imagem", async () => {
    assert.equal((await put(PNG, "text/plain")).status, 400);
  });

  test("400 quando os bytes não são JPG/PNG/WEBP/GIF (mesmo com Content-Type image/png)", async () => {
    const res = await put(Buffer.from("isto não é uma imagem de verdade"));
    assert.equal(res.status, 400);
    assert.match(res.json.error.message, /JPG, PNG, WEBP ou GIF/);
  });

  test("413 quando a foto passa de 2 MB", async () => {
    const res = await put(Buffer.alloc(2 * 1024 * 1024 + 1));
    assert.equal(res.status, 413);
    assert.equal(res.json.error.code, "VALIDATION_ERROR");
  });

  test("404 quando o usuário do token não existe", async () => {
    stub(prisma.user, "findUnique", async () => null);
    assert.equal((await put(PNG)).status, 404);
  });

  test("200 grava a foto, atualiza avatarUrl e devolve o perfil", async () => {
    let avatarUrl = "";
    stub(prisma.user, "findUnique", async () => ({ ...PUBLIC_USER, avatarUrl: null }));
    stub(prisma.user, "update", async ({ data }: any) => { avatarUrl = data.avatarUrl; return {}; });
    stubProfileStats();

    try {
      const res = await put(PNG);
      assert.equal(res.status, 200);
      assert.ok(avatarUrl.startsWith(`${baseUrl}/uploads/avatars/${USER_ID}-`), avatarUrl);
      assert.ok(avatarUrl.endsWith(".png"));
      assert.ok(res.json.data.stats);
    } finally {
      // Remove o arquivo criado em backend/uploads/avatars.
      if (avatarUrl) await unlink(path.join(UPLOADS_DIR, "avatars", path.basename(avatarUrl))).catch(() => undefined);
    }
  });
});

// =====================================================================
// Feed: GET /users/:username/feed
// =====================================================================
describe("GET /users/:username/feed", () => {
  test("404 quando o usuário não existe", async () => {
    stub(prisma.user, "findUnique", async () => null);
    assert.equal((await api("/users/fantasma/feed")).status, 404);
  });

  for (const limit of ["0", "101", "abc", "1.5", "-3"]) {
    test(`400 com limit=${limit}`, async () => {
      const res = await api(`/users/ana/feed?limit=${limit}`);
      assert.equal(res.status, 400);
      assert.equal(res.json.error.code, "VALIDATION_ERROR");
    });
  }

  test("usa limit padrão 30 e respeita limit=5", async () => {
    const takes: number[] = [];
    stub(prisma.user, "findUnique", async () => ({ id: USER_ID }));
    stub(prisma.review, "findMany", async ({ take }: any) => { takes.push(take); return []; });

    await api("/users/ana/feed");
    await api("/users/ana/feed?limit=5");
    await api("/users/ana/feed?limit=100");

    assert.deepEqual(takes, [30, 5, 100]);
  });

  test("converte nota para número, zera resenha em branco e achata os artistas", async () => {
    stub(prisma.user, "findUnique", async () => ({ id: USER_ID }));
    stub(prisma.review, "findMany", async () => [
      { id: "r1", rating: "4.5", content: "  ", createdAt: CREATED_AT, album: ALBUM_ROW, ...NO_LIKES },
      { id: "r2", rating: "3", content: "Bom", createdAt: CREATED_AT, album: ALBUM_ROW, ...NO_LIKES },
    ]);

    const res = await api("/users/ana/feed");

    assert.equal(res.status, 200);
    assert.equal(res.json.data[0].rating, 4.5);
    assert.equal(res.json.data[0].content, null);
    assert.equal(res.json.data[1].content, "Bom");
    assert.deepEqual(res.json.data[0].album, ALBUM_SUMMARY);
  });
});

// =====================================================================
// Favoritos
// =====================================================================
describe("favoritos", () => {
  test("GET /users/:username/favorites → 404 para usuário inexistente", async () => {
    stub(prisma.user, "findUnique", async () => null);
    assert.equal((await api("/users/fantasma/favorites")).status, 404);
  });

  test("GET /users/:username/favorites → 200 com álbuns resumidos", async () => {
    stub(prisma.user, "findUnique", async () => ({ id: USER_ID }));
    stub(prisma.favorite, "findMany", async () => [{ album: ALBUM_ROW }]);
    const res = await api("/users/ana/favorites");
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.data, [ALBUM_SUMMARY]);
  });

  test("POST /users/me/favorites → 400 sem albumId, vazio ou com mais de 64 caracteres", async () => {
    for (const body of [{}, { albumId: "" }, { albumId: "   " }, { albumId: 123 }, { albumId: "x".repeat(65) }]) {
      const res = await api("/users/me/favorites", { method: "POST", token: tokenFor(), body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  test("POST /users/me/favorites → 201 e usa upsert (favoritar duas vezes não dá erro)", async () => {
    let upsertArgs: any;
    stub(prisma.album, "findUnique", async () => ({ id: ALBUM_ID }));
    stub(prisma.favorite, "upsert", async (args: any) => { upsertArgs = args; return {}; });
    stub(prisma.album, "findUniqueOrThrow", async () => ALBUM_ROW);

    const res = await api("/users/me/favorites", {
      method: "POST", token: tokenFor(), body: { albumId: `  ${EXTERNAL_ALBUM}  ` },
    });

    assert.equal(res.status, 201);
    assert.deepEqual(res.json.data, ALBUM_SUMMARY);
    assert.deepEqual(upsertArgs.where, { userId_albumId: { userId: USER_ID, albumId: ALBUM_ID } });
    assert.deepEqual(upsertArgs.update, {});
  });

  test("DELETE /users/me/favorites/:albumId → 204 e só remove do usuário logado", async () => {
    let where: any;
    stub(prisma.favorite, "deleteMany", async (args: any) => { where = args.where; return { count: 0 }; });

    const res = await api(`/users/me/favorites/${EXTERNAL_ALBUM}`, { method: "DELETE", token: tokenFor() });

    assert.equal(res.status, 204); // idempotente: mesmo sem nada para remover
    assert.deepEqual(where, { userId: USER_ID, album: { externalId: EXTERNAL_ALBUM } });
  });
});

// =====================================================================
// Avaliações: /albums/:id/reviews e /albums/:id/rating
// =====================================================================
describe("POST /albums/:id/reviews", () => {
  const post = (body: unknown) =>
    api(`/albums/${EXTERNAL_ALBUM}/reviews`, { method: "POST", token: tokenFor(), body });

  test("400 para notas fora das regras (1 a 5, de 0,5 em 0,5)", async () => {
    for (const rating of [0, 0.4, 0.5, 5.5, 6, -1, 4.3, "4", null, undefined]) {
      const res = await post({ rating });
      assert.equal(res.status, 400, `rating ${String(rating)} deveria ser recusado`);
    }
  });

  test("400 quando content não é texto ou passa de 5000 caracteres", async () => {
    assert.equal((await post({ rating: 4, content: 42 })).status, 400);
    assert.equal((await post({ rating: 4, content: "a".repeat(5001) })).status, 400);
  });

  test("404 quando o álbum não existe na API de música", async () => {
    stub(prisma.album, "findUnique", async () => null);
    provider = { getAlbum: async () => { throw AppError.notFound("Álbum não encontrado."); } };
    const res = await post({ rating: 4 });
    assert.equal(res.status, 404);
    assert.equal(res.json.error.message, "Álbum não encontrado.");
  });

  test("409 quando o usuário já avaliou o álbum (P2002)", async () => {
    stub(prisma.album, "findUnique", async () => ({ id: ALBUM_ID }));
    stub(prisma.review, "create", async () => { throw Object.assign(new Error("unique"), { code: "P2002" }); });
    const res = await post({ rating: 4 });
    assert.equal(res.status, 409);
    assert.equal(res.json.error.message, "Você já avaliou este álbum.");
  });

  test("201 aceita notas-limite e grava com o userId do token", async () => {
    let data: any;
    stub(prisma.album, "findUnique", async () => ({ id: ALBUM_ID }));
    stub(prisma.review, "create", async (args: any) => {
      data = args.data;
      return { id: REVIEW_ID, rating: args.data.rating, content: args.data.content, createdAt: CREATED_AT };
    });
    stubAlbumRating();

    for (const rating of [1, 2.5, 5]) {
      const res = await post({ rating });
      assert.equal(res.status, 201, `rating ${rating} deveria ser aceito`);
      assert.equal(res.json.data.rating, rating);
    }
    assert.equal(data.userId, USER_ID);
    assert.equal(data.albumId, ALBUM_ID);
  });

  test("201 apara a resenha e guarda texto em branco como null", async () => {
    const saved: Array<string | null> = [];
    stub(prisma.album, "findUnique", async () => ({ id: ALBUM_ID }));
    stub(prisma.review, "create", async ({ data }: any) => {
      saved.push(data.content);
      return { id: REVIEW_ID, rating: data.rating, content: data.content, createdAt: CREATED_AT };
    });
    stubAlbumRating();

    await post({ rating: 4, content: "  Ótimo  " });
    await post({ rating: 4, content: "   " });
    await post({ rating: 4 });

    assert.deepEqual(saved, ["Ótimo", null, null]);
  });
});

describe("PATCH /albums/:id/reviews/:reviewId", () => {
  const patch = (body: unknown) =>
    api(`/albums/${EXTERNAL_ALBUM}/reviews/${REVIEW_ID}`, { method: "PATCH", token: tokenFor(), body });

  test("400 com corpo vazio, não-objeto ou nota inválida", async () => {
    assert.equal((await patch({})).status, 400);
    assert.equal((await patch([])).status, 400);
    assert.equal((await patch({ rating: 9 })).status, 400);
  });

  test("404 quando a avaliação não existe ou é de outro usuário", async () => {
    let where: any;
    stub(prisma.review, "findFirst", async (args: any) => { where = args.where; return null; });

    const res = await patch({ rating: 3 });

    assert.equal(res.status, 404);
    // A busca precisa filtrar pelo dono: ninguém edita avaliação alheia.
    assert.deepEqual(where, { id: REVIEW_ID, userId: USER_ID, album: { externalId: EXTERNAL_ALBUM } });
  });

  test("200 permite apagar a resenha enviando content vazio", async () => {
    let data: any;
    stub(prisma.review, "findFirst", async () => ({ id: REVIEW_ID }));
    stub(prisma.review, "update", async (args: any) => {
      data = args.data;
      return { id: REVIEW_ID, rating: 4, content: null, createdAt: CREATED_AT };
    });
    stubAlbumRating();

    const res = await patch({ content: "" });

    assert.equal(res.status, 200);
    assert.deepEqual(data, { content: null }); // rating não enviado → não alterado
    assert.equal(res.json.data.content, null);
  });
});

describe("GET /albums/:id/rating", () => {
  const stubAggregate = (avg: unknown, count: number) =>
    stub(prisma.review, "aggregate", async () => ({ _avg: { rating: avg }, _count: { _all: count } }));

  test("álbum sem avaliações: média null e contagem 0", async () => {
    stubAggregate(null, 0);
    const res = await api(`/albums/${EXTERNAL_ALBUM}/rating`);
    assert.deepEqual(res.json, { data: { albumId: EXTERNAL_ALBUM, averageRating: null, ratingsCount: 0 } });
  });

  test("arredonda a média para 1 casa decimal", async () => {
    stubAggregate(4.26, 3);
    assert.equal((await api(`/albums/${EXTERNAL_ALBUM}/rating`)).json.data.averageRating, 4.3);

    stubAggregate("3.75", 4); // o Prisma devolve Decimal, não number
    assert.equal((await api(`/albums/${EXTERNAL_ALBUM}/rating`)).json.data.averageRating, 3.8);
  });
});

describe("DELETE /albums/:id/reviews/:reviewId", () => {
  const del = (reviewId = REVIEW_ID) =>
    api(`/albums/${EXTERNAL_ALBUM}/reviews/${reviewId}`, { method: "DELETE", token: tokenFor() });

  test("401 sem login", async () => {
    const res = await api(`/albums/${EXTERNAL_ALBUM}/reviews/${REVIEW_ID}`, { method: "DELETE" });
    assert.equal(res.status, 401);
  });

  test("404 para id fora do formato uuid, sem consultar o banco", async () => {
    stub(prisma.review, "findFirst", async () => { throw new Error("não deveria consultar"); });
    assert.equal((await del("abc")).status, 404);
  });

  test("404 quando a avaliação é de outro usuário", async () => {
    let where: any;
    stub(prisma.review, "findFirst", async (args: any) => { where = args.where; return null; });
    assert.equal((await del()).status, 404);
    assert.deepEqual(where, { id: REVIEW_ID, userId: USER_ID, album: { externalId: EXTERNAL_ALBUM } });
  });

  test("200 apaga e devolve a média atualizada", async () => {
    let deleted: any;
    stub(prisma.review, "findFirst", async () => ({ id: REVIEW_ID }));
    stub(prisma.review, "delete", async (args: any) => { deleted = args.where; return {}; });
    stubAlbumRating();

    const res = await del();

    assert.equal(res.status, 200);
    assert.deepEqual(deleted, { id: REVIEW_ID });
    assert.deepEqual(res.json.data.albumRating, { albumId: EXTERNAL_ALBUM, averageRating: null, ratingsCount: 0 });
  });
});

describe("seguir com id inválido", () => {
  test("404 em vez de 500 quando o id não é uuid", async () => {
    stub(prisma.user, "findUnique", async () => { throw new Error("não deveria consultar"); });
    for (const method of ["GET", "POST", "DELETE"]) {
      const res = await api("/users/abc/follow", { method, token: tokenFor() });
      assert.equal(res.status, 404, method);
    }
  });
});

describe("GET /albums/:id/reviews", () => {
  test("200 só consulta resenhas com texto, da mais recente para a mais antiga", async () => {
    let args: any;
    stub(prisma.review, "findMany", async (a: any) => {
      args = a;
      return [{
        id: REVIEW_ID, rating: "4.5", content: "Boa", createdAt: CREATED_AT,
        user: { id: USER_ID, name: "Ana", username: "ana", avatarUrl: null },
        ...NO_LIKES,
      }];
    });

    const res = await api(`/albums/${EXTERNAL_ALBUM}/reviews`);

    assert.equal(res.status, 200);
    assert.deepEqual(args.where, {
      album: { externalId: EXTERNAL_ALBUM },
      content: { not: null },
      NOT: { content: "" },
    });
    assert.deepEqual(args.orderBy, { createdAt: "desc" });
    assert.equal(res.json.data[0].rating, 4.5);
    assert.equal(res.json.data[0].user.username, "ana");
  });
});

// =====================================================================
// Rotas de música (provider falso)
// =====================================================================
describe("rotas de música", () => {
  describe("validação de parâmetros", () => {
    const searchRoutes = ["/albums/search", "/albums/search/by-artist", "/artists/search"];

    for (const route of searchRoutes) {
      test(`${route}: 400 sem q, com q em branco ou repetido`, async () => {
        for (const qs of ["", "?q=", "?q=%20%20", "?q=a&q=b"]) {
          const res = await api(`${route}${qs}`);
          assert.equal(res.status, 400, `${route}${qs}`);
          assert.equal(res.json.error.code, "VALIDATION_ERROR");
        }
      });

      test(`${route}: 400 com limit inválido`, async () => {
        for (const limit of ["0", "51", "abc", "1.5", "-1"]) {
          const res = await api(`${route}?q=daft&limit=${limit}`);
          assert.equal(res.status, 400, `limit=${limit}`);
        }
      });
    }

    test("/albums/new-releases: 400 com limit inválido", async () => {
      assert.equal((await api("/albums/new-releases?limit=51")).status, 400);
    });
  });

  describe("respostas de sucesso", () => {
    test("/albums/search repassa termo aparado e limit para o provider", async () => {
      let received: unknown[] = [];
      provider = { searchAlbums: async (...args) => { received = args; return []; } };

      const res = await api("/albums/search?q=%20daft%20punk%20&limit=50");

      assert.equal(res.status, 200);
      assert.deepEqual(res.json, { data: [] });
      assert.deepEqual(received, ["daft punk", { limit: 50 }]);
    });

    test("/albums/search sem limit manda limit undefined", async () => {
      let received: unknown[] = [];
      provider = { searchAlbums: async (...args) => { received = args; return []; } };
      await api("/albums/search?q=daft");
      assert.deepEqual(received, ["daft", { limit: undefined }]);
    });

    test("/albums/search/by-artist devolve { artist, albums }", async () => {
      provider = {
        searchAlbumsByArtist: async () => ({
          artist: { externalId: "27", name: "Daft Punk", imageUrl: null },
          albums: [ALBUM_SUMMARY],
        }),
      };
      const res = await api("/albums/search/by-artist?q=daft");
      assert.equal(res.status, 200);
      assert.equal(res.json.data.artist.name, "Daft Punk");
      assert.equal(res.json.data.albums.length, 1);
    });

    test("/artists/search devolve a lista de artistas", async () => {
      provider = { searchArtists: async () => [{ externalId: "27", name: "Daft Punk", imageUrl: null }] };
      const res = await api("/artists/search?q=daft");
      assert.equal(res.status, 200);
      assert.equal(res.json.data[0].name, "Daft Punk");
    });

    test("/albums/new-releases não é capturada por /albums/:externalId", async () => {
      provider = {
        getNewReleases: async () => [ALBUM_SUMMARY],
        getAlbum: async () => { throw new Error("getAlbum não deveria ser chamado"); },
      };
      const res = await api("/albums/new-releases?limit=10");
      assert.equal(res.status, 200);
      assert.equal(res.json.data.length, 1);
    });

    test("/albums/:externalId devolve o álbum do provider", async () => {
      let id = "";
      provider = { getAlbum: async (externalId: string) => { id = externalId; return { ...ALBUM_SUMMARY, tracks: [] } as any; } };
      const res = await api(`/albums/${EXTERNAL_ALBUM}`);
      assert.equal(res.status, 200);
      assert.equal(id, EXTERNAL_ALBUM);
      assert.equal(res.json.data.title, "Discovery");
    });
  });

  describe("erros do provider viram respostas HTTP corretas", () => {
    const cases: Array<[string, () => Error, number, string]> = [
      ["álbum inexistente", () => AppError.notFound("Álbum não encontrado."), 404, "NOT_FOUND"],
      ["timeout", () => ExternalApiError.timeout(), 504, "EXTERNAL_API_TIMEOUT"],
      ["rate limit", () => ExternalApiError.rateLimited(), 429, "EXTERNAL_API_RATE_LIMITED"],
      ["serviço fora (503)", () => ExternalApiError.unavailable(503), 503, "EXTERNAL_API_UNAVAILABLE"],
      ["resposta inválida (502)", () => ExternalApiError.unavailable(502), 502, "EXTERNAL_API_UNAVAILABLE"],
    ];

    for (const [label, makeError, status, code] of cases) {
      test(`${label} → ${status} ${code}`, async () => {
        provider = { getAlbum: async () => { throw makeError(); } };
        const res = await api(`/albums/${EXTERNAL_ALBUM}`);
        assert.equal(res.status, status);
        assert.equal(res.json.error.code, code);
        assert.equal(typeof res.json.error.message, "string");
      });
    }

    test("erro inesperado → 500 INTERNAL_ERROR sem vazar detalhes", async () => {
      provider = { getAlbum: async () => { throw new Error("senha do banco: 123"); } };
      const res = await api(`/albums/${EXTERNAL_ALBUM}`);
      assert.equal(res.status, 500);
      assert.deepEqual(res.json, { error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor." } });
    });
  });
});