"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Modal } from "@/components/Modal/Modal";
import type { UserProfile } from "@/lib/api/user";
import { EditProfileForm } from "./EditProfileForm";
import styles from "./EditProfile.module.css";

interface EditProfileButtonProps {
  profile: UserProfile;
}

/** Botão "Editar perfil": só aparece para o dono do perfil. */
export function EditProfileButton({ profile }: EditProfileButtonProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session || session.user.id !== profile.id) return null;

  return (
    <>
      <button type="button" className={styles.editButton} onClick={() => setOpen(true)}>
        Editar perfil
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar perfil">
        {/* A key remonta o formulário a cada abertura, com os dados atuais. */}
        {open && <EditProfileForm key={profile.username} profile={profile} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}
