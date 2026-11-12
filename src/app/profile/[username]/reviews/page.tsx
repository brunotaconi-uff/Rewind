import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { ProfileFeed } from "@/components/ProfileFeed/ProfileFeed";
import { EmptyState } from "@/components/Section/Section";
import { getErrorCode } from "@/lib/api/client";
import { getUserFeed, type FeedItem } from "@/lib/api/user";
import { getServerAccessToken } from "@/lib/auth";

// A rota do feed aceita no máximo 100 itens; aqui só ficam os que têm texto.
const FEED_LIMIT = 100;

interface ReviewsTabProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function ReviewsTab({ params }: ReviewsTabProps) {
  const username = decodeURIComponent((await params).username);

  let items: FeedItem[];
  try {
    items = await getUserFeed(username, FEED_LIMIT, await getServerAccessToken());
  } catch (error) {
    return <ApiErrorMessage code={getErrorCode(error)} title="Não foi possível carregar as resenhas" />;
  }

  const reviews = items.filter((item) => item.content !== null);
  if (reviews.length === 0) {
    return <EmptyState>@{username} ainda não escreveu nenhuma resenha.</EmptyState>;
  }
  return <ProfileFeed items={reviews} />;
}
