import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AppError } from "../src/errors/AppError";
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
