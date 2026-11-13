import type { Metadata } from "next";
import { Suspense } from "react";
import { AlbumShelf, AlbumShelfSkeleton } from "@/components/AlbumShelf/AlbumShelf";
import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { EmptyState, Section } from "@/components/Section/Section";
import { UserSearchResults } from "@/components/UserSearchResults/UserSearchResults";
import { getErrorCode, type ApiErrorCode } from "@/lib/api/client";
import { searchAlbums, searchAlbumsByArtist } from "@/lib/api/music";
import styles from "./page.module.css";

const RESULTS_LIMIT = 12;

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>;
}

function readQuery(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function readType(value: string | string[] | undefined): "albums" | "users" {
  return (Array.isArray(value) ? value[0] : value) === "users" ? "users" : "albums";
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = readQuery(params.q);
  const type = readType(params.type);
  return { title: query ? `Busca: ${query}` : type === "users" ? "Buscar pessoas" : "Busca" };
}

type Loaded<T> = { data: T; errorCode: null } | { data: null; errorCode: ApiErrorCode };

async function load<T>(request: Promise<T>): Promise<Loaded<T>> {
  try {
    return { data: await request, errorCode: null };
  } catch (error) {
    return { data: null, errorCode: getErrorCode(error) };
  }
}

function normalize(text: string): string {
  return text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function SearchResults({ query }: { query: string }) {
  // 4.2-B1 e 4.2-B2 em paralelo; uma falha não esconde o resultado da outra.
  const [byTitle, byArtist] = await Promise.all([
    load(searchAlbums(query, RESULTS_LIMIT)),
    load(searchAlbumsByArtist(query, RESULTS_LIMIT)),
  ]);

  const noTitleResults = byTitle.data?.length === 0;
  const noArtistResults = byArtist.data?.albums.length === 0;
  if (noTitleResults && noArtistResults) {
    return (
      <EmptyState>
        Nenhum álbum ou artista encontrado para “{query}”. Confira a grafia ou tente outro nome.
      </EmptyState>
    );
  }

  const artist = byArtist.data?.artist ?? null;

  const titleSection = (
    <Section key="title" title="Álbuns">
      {byTitle.errorCode ? (
        <ApiErrorMessage code={byTitle.errorCode} title="Não foi possível buscar os álbuns" />
      ) : byTitle.data.length > 0 ? (
        <AlbumShelf albums={byTitle.data} />
      ) : (
        <EmptyState>Nenhum álbum com esse nome.</EmptyState>
      )}
    </Section>
  );

  const artistSection = (
    <Section key="artist" title={artist ? `Álbuns de ${artist.name}` : "Álbuns do artista"}>
      {byArtist.errorCode ? (
        <ApiErrorMessage code={byArtist.errorCode} title="Não foi possível buscar os álbuns do artista" />
      ) : byArtist.data.albums.length > 0 ? (
        <AlbumShelf albums={byArtist.data.albums} />
      ) : (
        <EmptyState>Nenhum artista encontrado com esse nome.</EmptyState>
      )}
    </Section>
  );

  // Se o termo é exatamente o nome do artista ("daft punk"), os álbuns dele vêm primeiro,
  // a menos que também seja exatamente o nome de um álbum ("discovery").
  const term = normalize(query);
  const artistFirst =
    artist !== null &&
    normalize(artist.name) === term &&
    !byTitle.data?.some((album) => normalize(album.title) === term);
  return artistFirst ? [artistSection, titleSection] : [titleSection, artistSection];
}

function SearchResultsSkeleton() {
  return (
    <>
      <Section title="Álbuns">
        <AlbumShelfSkeleton />
      </Section>
      <Section title="Álbuns do artista">
        <AlbumShelfSkeleton />
      </Section>
    </>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = readQuery(params.q);
  const type = readType(params.type);

  if (!query) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>{type === "users" ? "Buscar pessoas" : "Buscar álbuns"}</h1>
        <EmptyState>
          {type === "users"
            ? "Digite o nome de usuário na barra de busca acima."
            : "Digite o nome de um álbum ou de um artista na barra de busca acima."}
        </EmptyState>
      </div>
    );
  }

  if (type === "users") {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Pessoas para “{query}”</h1>
        <UserSearchResults query={query} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Resultados para “{query}”</h1>
      {/* A key reinicia o carregamento (e o esqueleto) a cada nova busca. */}
      <Suspense key={query} fallback={<SearchResultsSkeleton />}>
        <SearchResults query={query} />
      </Suspense>
    </div>
  );
}
