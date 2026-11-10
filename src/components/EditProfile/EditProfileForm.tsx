"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useId, useState } from "react";
import { InputField } from "@/components/InputField/InputField";
import { ApiError, getErrorCode } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errorMessages";
import { updateMyProfile, type UserProfile } from "@/lib/api/user";
import styles from "./EditProfile.module.css";

const BIO_MAX_LENGTH = 300;

interface EditProfileFormProps {
  profile: UserProfile;
  onDone: () => void;
}

/** Mensagem para o usuário: as de validação e conflito do backend já são amigáveis. */
function describeError(error: unknown): string {
  if (error instanceof ApiError && (error.code === "VALIDATION_ERROR" || error.code === "CONFLICT")) {
    return error.message;
  }
  return getErrorMessage(getErrorCode(error));
}

export function EditProfileForm({ profile, onDone }: EditProfileFormProps) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const bioId = useId();

  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;

    setSaving(true);
    setError("");
    try {
      const updated = await updateMyProfile(session.accessToken, { name, username, bio, city, country });
      // Mantém a topbar e a checagem de dono certas com o novo nome de usuário.
      await updateSession({ username: updated.username, name: updated.name });

      onDone();
      if (updated.username !== profile.username) {
        // O endereço do perfil muda junto com o nome de usuário.
        router.replace(`/profile/${encodeURIComponent(updated.username)}`);
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <InputField label="Nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
      <InputField
        label="Nome de usuário"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        minLength={3}
        maxLength={30}
        pattern="[a-zA-Z0-9_.]+"
        title="Letras, números, ponto ou sublinhado"
        autoCapitalize="none"
        spellCheck={false}
        required
      />

      <div className={styles.field}>
        <label htmlFor={bioId} className={styles.label}>
          Bio
        </label>
        <textarea
          id={bioId}
          className={styles.textarea}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX_LENGTH}
          rows={4}
          placeholder="Conte um pouco do que você gosta de ouvir"
        />
        <span className={styles.counter}>
          {bio.length}/{BIO_MAX_LENGTH}
        </span>
      </div>

      <div className={styles.row}>
        <InputField label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
        <InputField label="País" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} />
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={onDone} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className={styles.primaryButton} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
