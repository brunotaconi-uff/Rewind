import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { FavoriteAlbums } from "@/components/Favorites/FavoriteAlbums";
import { EmptyState } from "@/components/Section/Section";
import { getErrorCode } from "@/lib/api/client";
import type { AlbumSummary } from "@/lib/api/music";
import { getUserFavorites } from "@/lib/api/user";

interface FavoritesTabProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function FavoritesTab({ params }: FavoritesTabProps) {
  const username = decodeURIComponent((await params).username);

  let albums: AlbumSummary[];
  try {
    albums = await getUserFavorites(username);
  } catch (error) {
    return <ApiErrorMessage code={getErrorCode(error)} title="Não foi possível carregar os favoritos" />;
  }

  if (albums.length === 0) {
    return <EmptyState>@{username} ainda não escolheu álbuns favoritos.</EmptyState>;
  }
  return <FavoriteAlbums albums={albums} />;
}
