# Perfil, busca de usuários e feed (5.2 / 6.2)

Rotas do perfil público, edição, foto, favoritos e feed. Os erros seguem o formato padronizado descrito em [api-musica.md](api-musica.md#erro-padronizado) (`{ error: { code, message } }`); a edição pode devolver também `CONFLICT` (409) quando o nome de usuário já está em uso.

As rotas com 🔒 exigem `Authorization: Bearer <token>`, o token devolvido por `POST /users/login`.

### Rotas

| Rota | Retorno |
|---|---|
| `GET /users/:username` | `{ data: Profile }`: dados públicos + `stats` (5.2-B1) |
| 🔒 `PATCH /users/me` | `{ data: Profile }`: edita `name`, `username`, `bio`, `city`, `country` (5.2-B2) |
| 🔒 `PUT /users/me/avatar` | `{ data: Profile }`: a imagem vai crua no corpo, com `Content-Type: image/...` (5.2-B3) |
| `GET /users/:username/favorites` | `{ data: AlbumSummary[] }`: adicionados por último primeiro (5.2-B4) |
| 🔒 `POST /users/me/favorites` | `201 { data: AlbumSummary }`: corpo `{ "albumId": "<externalId>" }` (5.2-B4) |
| 🔒 `DELETE /users/me/favorites/:albumId` | `204` (5.2-B4) |
| `GET /users/:username/feed?limit=` | `{ data: FeedItem[] }`: notas e resenhas, mais recentes primeiro; `limit` de 1 a 100, padrão 30 (5.2-B5) |
| 🔒 `GET /users/search?username=` | `{ data: UserSearchResult[] }`: busca parcial por nome de usuário; não inclui quem está buscando (6.2-B1) |
| 🔒 `GET /users/:userId/follow` | `{ data: { following: boolean } }`: informa se quem está autenticado segue o usuário (estado usado pela interface) |
| 🔒 `POST /users/:userId/follow` | `{ data: { following: true } }`: segue o usuário; não permite seguir a si mesmo (6.2-B2) |
| 🔒 `DELETE /users/:userId/follow` | `{ data: { following: false } }`: deixa de seguir o usuário (6.2-B2) |
| 🔒 `GET /users/feed?limit=` | `{ data: FeedItem[] }`: atividades das pessoas seguidas, mais recentes primeiro; `limit` de 1 a 100, padrão 30 (6.2-B4) |

```ts
interface Profile {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  stats: {
    albumsRated: number; // álbuns diferentes avaliados
    reviews: number;     // avaliações com texto
    followers: number;
    following: number;
  };
}

interface FeedItem {
  id: string;
  rating: number;
  content: string | null; // null = só nota, sem resenha
  createdAt: string;
  album: AlbumSummary;
  user?: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  }; // incluído no feed geral
}

interface UserSearchResult {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}
```

### Regras

- **Nome de usuário:** de 3 a 30 caracteres (letras, números, `.` e `_`), único sem diferenciar maiúsculas. `me` é reservado, porque `/users/me` é a rota do usuário logado.
- **Bio:** até 300 caracteres. Nome, cidade e país até 60. Mandar texto vazio em bio, cidade ou país apaga o valor.
- **Foto:** JPG, PNG, WEBP ou GIF de até 2 MB. O formato é conferido pelos bytes do arquivo, não pelo `Content-Type`. Fica em `backend/uploads/avatars` (fora do git) e é servida em `/uploads/avatars/...`. Ao trocar de foto, a anterior é apagada.
- **Favoritos:** na primeira vez que alguém favorita um álbum, ele é gravado na tabela `albums` (com os artistas) a partir da API de música. Favoritar de novo ou remover um álbum que não está na lista não dá erro.
- **Seguidores/seguindo:** os contadores do perfil são derivados das relações em `follows`; não é possível seguir a si mesmo.
- **Feed geral:** contém avaliações (com ou sem resenha) somente de usuários seguidos, em ordem decrescente de criação.
