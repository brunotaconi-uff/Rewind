import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { AlbumShelf, AlbumShelfSkeleton } from "@/components/AlbumShelf/AlbumShelf";
import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { EmptyState, Section } from "@/components/Section/Section";
import { getErrorCode, type ApiErrorCode } from "@/lib/api/client";
import { getNewReleases, getPopularAlbums, type AlbumSummary, type PopularAlbum } from "@/lib/api/music";
import type { AlbumRatingsMap } from "@/lib/api/review";
import { authOptions } from "@/lib/auth";
import styles from "./page.module.css";

const NEW_RELEASES_LIMIT = 12;
const POPULAR_LIMIT = 12;

type LoadResult<T> = { data: T; errorCode: null } | { data: null; errorCode: ApiErrorCode };

async function load<T>(request: Promise<T>): Promise<LoadResult<T>> {
  try {
    return { data: await request, errorCode: null };
  } catch (error) {
    return { data: null, errorCode: getErrorCode(error) };
  }
}

async function NewReleases() {
  const result = await load<AlbumSummary[]>(getNewReleases(NEW_RELEASES_LIMIT));

  if (result.errorCode) {
    return <ApiErrorMessage code={result.errorCode} title="Não foi possível carregar as novidades" />;
  }
  if (result.data.length === 0) {
    return <EmptyState>Nenhuma novidade no momento.</EmptyState>;
  }
  return <AlbumShelf albums={result.data} />;
}

/** Mais avaliados pela comunidade do Rewind (sai do nosso banco, não da Deezer). */
async function PopularAlbums() {
  const result = await load<PopularAlbum[]>(getPopularAlbums(POPULAR_LIMIT));

  if (result.errorCode) {
    return <ApiErrorMessage code={result.errorCode} title="Não foi possível carregar os álbuns populares" />;
  }
  if (result.data.length === 0) {
    return (
      <EmptyState>
        Ainda não há álbuns populares. Assim que a comunidade começar a avaliar, eles aparecem aqui.
      </EmptyState>
    );
  }
  const ratings: AlbumRatingsMap = Object.fromEntries(
    result.data.map(({ externalId, averageRating, ratingsCount }) => [externalId, { averageRating, ratingsCount }]),
  );
  return <AlbumShelf albums={result.data} ratings={ratings} />;
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user.name?.trim().split(/\s+/)[0];

  return (
    <div className={styles.page}>
      <h1 className={styles.greeting}>
        {firstName ? `Olá, ${firstName}!` : "Olá!"} Confira as novidades que acabaram de sair!
      </h1>

      <Section title="Novidades no nosso site">
        <Suspense fallback={<AlbumShelfSkeleton />}>
          <NewReleases />
        </Suspense>
      </Section>

      <Section title="Álbuns populares no Rewind">
        <Suspense fallback={<AlbumShelfSkeleton />}>
          <PopularAlbums />
        </Suspense>
      </Section>
    </div>
  );
}
