import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { ProfileHeader } from "@/components/ProfileHeader/ProfileHeader";
import { ProfileTabs } from "@/components/ProfileTabs/ProfileTabs";
import { ApiError, getErrorCode } from "@/lib/api/client";
import { getUserProfile, type UserProfile } from "@/lib/api/user";
import styles from "./layout.module.css";

interface ProfileLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: Pick<ProfileLayoutProps, "params">): Promise<Metadata> {
  const username = decodeURIComponent((await params).username);
  return { title: `@${username} | Rewind` };
}

export default async function ProfileLayout({ children, params }: ProfileLayoutProps) {
  const username = decodeURIComponent((await params).username);

  let profile: UserProfile;
  try {
    profile = await getUserProfile(username);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") notFound();
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <ApiErrorMessage code={getErrorCode(error)} title="Não foi possível carregar o perfil" />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <ProfileHeader profile={profile} />
        <ProfileTabs username={profile.username} />
        <section>{children}</section>
      </div>
    </main>
  );
}
