# Deploy na Vercel (3.5)

O Rewind fica em **dois projetos na Vercel**, os dois apontando para este repositório:

| Projeto | Root Directory | O que roda |
|---|---|---|
| Back | `backend` | Express (vira uma Vercel Function) + Postgres no Neon + fotos no Vercel Blob |
| Front | raiz do repositório | Next.js |

A cada merge no `main`, a Vercel publica os dois sozinha. Cada PR ganha um link de **preview** para testar antes do merge.

## Primeira configuração

### 1. Back

1. Na Vercel: **Add New → Project**, importar `lucasilvr/Rewind`, **Root Directory = `backend`**. (O dono do repositório precisa autorizar o app da Vercel no GitHub.)
2. Em **Storage**, criar e conectar ao projeto:
   - um banco **Neon (Postgres)**: preenche `DATABASE_URL` (com pooler) e `DATABASE_URL_UNPOOLED` (conexão direta, usada pelas migrations);
   - um **Blob** com acesso **público**: preenche `BLOB_STORE_ID`. Não precisa de token: dentro da Vercel, o SDK se autentica sozinho.
3. Em **Settings → Environment Variables**, adicionar:
   - `JWT_SECRET`: um valor novo, gerado com `openssl rand -hex 32` (não usar o do `.env` local).
   - As `MUSIC_*` são opcionais; os valores padrão servem.
4. Fazer o deploy e anotar a URL (ex.: `https://rewind-api.vercel.app`).

O build está em [`backend/vercel.json`](../backend/vercel.json): roda `prisma generate` sempre e `prisma migrate deploy` **só em produção**.

### 2. Front

1. **Add New → Project**, mesmo repositório, **Root Directory = raiz**.
2. Variáveis de ambiente:
   - `NEXT_PUBLIC_API_URL`: URL do back;
   - `NEXTAUTH_URL`: URL do próprio front (ex.: `https://rewind.vercel.app`);
   - `NEXTAUTH_SECRET`: gerado com `openssl rand -base64 32`.
3. Fazer o deploy.

## No dia a dia

- **Mudou só código:** é só fazer o merge no `main` como sempre.
- **Criou migration:** também só o merge. O deploy de produção do back aplica a migration antes de publicar.
- **Previews não mexem no banco.** O preview de um PR usa o banco de produção, mas sem rodar as migrations do PR. Se o PR traz uma migration nova, as rotas que dependem dela podem falhar no preview até o merge.
- **O banco de produção começa vazio:** cada pessoa cria a própria conta pelo cadastro do site.
- **Algo quebrou?** Em **Deployments → (deploy) → Logs**, ficam os erros de build e de execução. Para voltar para a versão anterior, use **Instant Rollback** no deploy que estava funcionando.

## Diferenças entre local e produção

| | Local | Produção |
|---|---|---|
| Banco | Postgres do `docker-compose` (porta 5433) | Neon |
| Fotos de perfil | `backend/uploads` (sem `BLOB_STORE_ID`) | Vercel Blob |
| Cache das buscas na Deezer | em memória, dura enquanto o servidor roda | em memória, zera quando a Vercel recicla a função |

Rodar localmente continua igual: veja o [README](../README.md).
