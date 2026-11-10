"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar/Avatar";
import { ApiError, getErrorCode } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errorMessages";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, uploadMyAvatar, type UserProfile } from "@/lib/api/user";
import styles from "./EditProfile.module.css";

interface AvatarUploadProps {
  profile: UserProfile;
}

/** Troca a foto assim que o arquivo é escolhido, sem esperar o "Salvar" do formulário. */
export function AvatarUpload({ profile }: AvatarUploadProps) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Limpa o input para conseguir escolher o mesmo arquivo de novo depois de um erro.
    event.target.value = "";
    if (!file || !session) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      setError("Escolha uma imagem JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("A foto deve ter no máximo 2 MB.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const updated = await uploadMyAvatar(session.accessToken, file);
      setAvatarUrl(updated.avatarUrl);
      await updateSession({ image: updated.avatarUrl });
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "VALIDATION_ERROR"
          ? caught.message
          : getErrorMessage(getErrorCode(caught)),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.avatarField}>
      <Avatar src={avatarUrl} name={profile.name} size={80} />
      <div className={styles.avatarInfo}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Enviando..." : avatarUrl ? "Trocar foto" : "Enviar foto"}
        </button>
        <span className={styles.hint}>JPG, PNG, WEBP ou GIF, até 2 MB.</span>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        onChange={handleFile}
        className={styles.fileInput}
        aria-label="Foto de perfil"
      />
    </div>
  );
}
