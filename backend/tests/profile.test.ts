import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AppError } from "../src/errors/AppError";
import { detectImageType } from "../src/services/avatar.service";
import { parseProfileUpdate } from "../src/services/profile.validation";

function assertValidationError(fn: () => unknown) {
  assert.throws(fn, (error) => error instanceof AppError && error.code === "VALIDATION_ERROR");
}

describe("parseProfileUpdate", () => {
  test("mantém só os campos enviados e apara espaços", () => {
    assert.deepEqual(parseProfileUpdate({ name: "  Ana  ", bio: " Ouço de tudo " }), {
      name: "Ana",
      bio: "Ouço de tudo",
    });
  });

  test("texto vazio apaga bio, cidade e país", () => {
    assert.deepEqual(parseProfileUpdate({ bio: "", city: "   ", country: null }), {
      bio: null,
      city: null,
      country: null,
    });
  });

  test("aceita username com letras, números, ponto e sublinhado", () => {
    assert.deepEqual(parseProfileUpdate({ username: "ana.silva_92" }), { username: "ana.silva_92" });
  });

  test("recusa username curto, com espaço ou reservado", () => {
    assertValidationError(() => parseProfileUpdate({ username: "ab" }));
    assertValidationError(() => parseProfileUpdate({ username: "ana silva" }));
    assertValidationError(() => parseProfileUpdate({ username: "ME" }));
  });

  test("recusa nome vazio e textos longos demais", () => {
    assertValidationError(() => parseProfileUpdate({ name: "  " }));
    assertValidationError(() => parseProfileUpdate({ bio: "a".repeat(301) }));
  });

  test("recusa corpo que não é objeto e campos com tipo errado", () => {
    assertValidationError(() => parseProfileUpdate(undefined));
    assertValidationError(() => parseProfileUpdate(["nome"]));
    assertValidationError(() => parseProfileUpdate({ bio: 42 }));
  });
});

describe("detectImageType", () => {
  test("reconhece JPG, PNG, WEBP e GIF pelos primeiros bytes", () => {
    assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "jpg");
    assert.equal(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "png");
    assert.equal(detectImageType(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "ascii")), "webp");
    assert.equal(detectImageType(Buffer.from("GIF89a...", "ascii")), "gif");
  });

  test("recusa arquivo que não é imagem, mesmo com Content-Type de imagem", () => {
    assert.equal(detectImageType(Buffer.from("<script>alert(1)</script>")), null);
    assert.equal(detectImageType(Buffer.alloc(0)), null);
  });
});
