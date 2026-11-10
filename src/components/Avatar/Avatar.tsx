import styles from "./Avatar.module.css";

interface AvatarProps {
  src: string | null | undefined;
  /** Nome do usuário: vira as iniciais quando não há foto. */
  name: string;
  size?: number;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

/** Foto de perfil redonda; sem foto, mostra as iniciais do nome. */
export function Avatar({ src, name, size = 40 }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a foto vem do backend, que pode estar em outro domínio
        <img src={src} alt="" className={styles.image} />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
