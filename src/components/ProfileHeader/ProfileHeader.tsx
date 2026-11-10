import { Avatar } from "@/components/Avatar/Avatar";
import type { UserProfile } from "@/lib/api/user";
import { formatMonthYear } from "@/lib/format";
import styles from "./ProfileHeader.module.css";

interface ProfileHeaderProps {
  profile: UserProfile;
  /** Ações ao lado do nome (ex.: botão de editar, só para o dono). */
  actions?: React.ReactNode;
}

export function ProfileHeader({ profile, actions }: ProfileHeaderProps) {
  const { stats } = profile;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");

  const counters = [
    { label: stats.albumsRated === 1 ? "Avaliado" : "Avaliados", value: stats.albumsRated },
    { label: stats.reviews === 1 ? "Resenha" : "Resenhas", value: stats.reviews },
    { label: stats.followers === 1 ? "Seguidor" : "Seguidores", value: stats.followers },
    { label: "Seguindo", value: stats.following },
  ];

  return (
    <header className={styles.header}>
      <Avatar src={profile.avatarUrl} name={profile.name} size={112} />

      <div className={styles.info}>
        <div className={styles.titleRow}>
          <h1 className={styles.name}>{profile.name}</h1>
          {actions}
        </div>
        <p className={styles.meta}>
          @{profile.username}
          {location && <> · {location}</>} · Membro desde {formatMonthYear(profile.createdAt)}
        </p>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        <dl className={styles.stats}>
          {counters.map(({ label, value }) => (
            <div key={label} className={styles.stat}>
              <dt className={styles.statLabel}>{label}</dt>
              <dd className={styles.statValue}>{value.toLocaleString("pt-BR")}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
