# Avaliações, médias e curtidas (5.4 / 6.3)

Rotas de nota e resenha de álbuns, médias da comunidade e curtidas. Os erros seguem o formato padronizado de [api-musica.md](api-musica.md#erro-padronizado) (`{ error: { code, message } }`). As rotas com 🔒 exigem `Authorization: Bearer <token>`.

`:id` é sempre o `externalId` do álbum (o id da Deezer).

### Rotas

| Rota | Retorno |
|---|---|
| 🔒 `POST /albums/:id/reviews` | `201 { data: SavedReview }`: corpo `{ rating, content? }`. Uma avaliação por pessoa e álbum (409 se repetir) |
| 🔒 `GET /albums/:id/reviews/me` | `{ data: MyReview \| null }`: a avaliação de quem está logado |
| 🔒 `PATCH /albums/:id/reviews/:reviewId` | `{ data: SavedReview }`: altera `rating` e/ou `content`; `content` vazio apaga a resenha e mantém a nota |
| 🔒 `DELETE /albums/:id/reviews/:reviewId` | `{ data: { albumRating: AlbumRating } }`: apaga a própria avaliação (as curtidas saem junto) |
| `GET /albums/:id/rating` | `{ data: AlbumRating }`: média e total de avaliações |
| `GET /albums/:id/reviews` | `{ data: AlbumReview[] }`: só avaliações com texto, mais recentes primeiro. Com token, cada uma traz `likedByMe` |
| `GET /albums/ratings?ids=1,2,3` | `{ data: Record<externalId, { averageRating, ratingsCount }> }`: médias de até 50 álbuns; os sem avaliação ficam de fora |
| `GET /albums/popular?limit=` | `{ data: PopularAlbum[] }`: álbuns mais avaliados no Rewind (desempate pela média); `limit` de 1 a 50, padrão 12 |
| 🔒 `POST /reviews/:reviewId/like` | `{ data: LikeSummary }`: curte a avaliação de outra pessoa; curtir de novo não conta duas vezes |
| 🔒 `DELETE /reviews/:reviewId/like` | `{ data: LikeSummary }`: desfaz a curtida |

```ts
interface AlbumRating {
  albumId: string;              // externalId
  averageRating: number | null; // 1 casa decimal; null sem avaliações
  ratingsCount: number;
}

interface MyReview {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
}

interface SavedReview extends MyReview {
  albumRating: AlbumRating; // média já recalculada
}

interface PopularAlbum extends AlbumSummary {
  averageRating: number | null;
  ratingsCount: number;
}

interface LikeSummary {
  reviewId: string;
  likesCount: number;
  likedByMe: boolean;
}
```

### Regras

- **Nota:** de 1 a 5, em passos de 0,5. Resenha opcional, até 5000 caracteres; resenha sem nota é recusada.
- **Primeira avaliação de um álbum:** o álbum é gravado na tabela `albums` (com os artistas) a partir da API de música; álbum inexistente na fonte responde 404.
- **Dono:** só quem fez a avaliação pode editá-la ou apagá-la. Avaliação de outra pessoa, ou `:reviewId` fora do formato uuid, responde 404.
- **Curtidas:** não é possível curtir a própria avaliação.
