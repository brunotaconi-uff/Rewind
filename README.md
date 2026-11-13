# Rewind

O **Rewind** é uma rede social para quem gosta de música, inspirada no Letterboxd: você busca álbuns, dá notas, escreve resenhas, guarda favoritos e acompanha o que as pessoas que você segue estão ouvindo.

Trabalho prático da disciplina **Gerência de Projeto e Manutenção de Software (GPMS, TCC00363)**, da Profa. Rebeca Motta, na Universidade Federal Fluminense (UFF).

**Demo:** https://rewind-dusky.vercel.app/ (a conta de teste está no Plano de Projeto; também dá para criar uma conta na tela de cadastro).

## Funcionalidades

- **Busca de álbuns e artistas** com dados da API pública da Deezer.
- **Página do álbum** com faixas, média da comunidade e resenhas.
- **Avaliação de álbuns**: nota de 1 a 5 estrelas (com meia estrela) e resenha opcional; dá para editar ou excluir a sua.
- **Home** com lançamentos e os álbuns mais avaliados no Rewind.
- **Cadastro e login** com sessão (NextAuth + JWT).
- **Perfil** com foto, bio, estatísticas, atividade, resenhas e álbuns favoritos.
- **Seguir pessoas** e **feed** com as notas e resenhas de quem você segue.
- **Curtidas** nas avaliações de outras pessoas.

O diário de escuta e as listas temáticas, previstos no início, saíram do escopo na Rodada 2 (registro de mudanças no Plano de Projeto).

## Tecnologias

| Camada | Stack |
|---|---|
| Front-end | Next.js 16 (App Router), React 19, TypeScript, CSS Modules, NextAuth |
| Back-end | Node.js, Express 5, TypeScript, Prisma 7, PostgreSQL |
| Dados de música | API pública da Deezer (isolada em `backend/src/services/music`) |
| Deploy | Vercel (front e back) + Neon (Postgres) + Vercel Blob (fotos) |
| Testes | `node:test` com `tsx`, banco e API de música simulados |

## Como rodar localmente

Pré-requisitos: [Node.js](https://nodejs.org/) 20 ou superior, [Git](https://git-scm.com/) e [Docker](https://www.docker.com/) (para o PostgreSQL).

```bash
git clone https://github.com/lucasilvr/Rewind.git
cd Rewind
```

### Back-end

```bash
cd backend
npm install
cp .env.example .env        # preencha JWT_SECRET (ex.: openssl rand -hex 32)
docker compose -f ../docker-compose.yml up -d   # Postgres na porta 5433
npx prisma migrate dev
npm run dev                 # http://localhost:3001
```

### Front-end

Em outro terminal, na raiz do projeto:

```bash
npm install
cp .env.example .env.local  # preencha NEXTAUTH_SECRET (ex.: openssl rand -base64 32)
npm run dev                 # http://localhost:3000
```

## Testes e qualidade

Na raiz do projeto:

```bash
npm test        # testes do back-end (rotas, serviços e provider da Deezer)
npm run lint    # ESLint do front e do back
npm run build   # build de produção do Next.js
```

Os testes não precisam de PostgreSQL nem de acesso à Deezer: o banco e o provider de música são simulados.

## Gerência de configuração

- **Fluxo:** GitHub Flow. A `main` é protegida; cada tarefa do Trello vira uma branch (`feature/`, `fix/` ou `refactor/` + código da tarefa) integrada por pull request revisado, com merge commit.
- **Versões:** tags `v1.0` (Rodada 1), `v2.0` (Rodada 2) e `v3.0` (entrega final).
- **Controle de modificações:** quadro do Trello, um cartão por história da EAP.
- **Documentação:** tudo em [`docs/`](docs/README.md) (plano de projeto, planilhas de monitoramento, EAP, cronograma, riscos e guias técnicos).

## Equipe

| Integrante | Papel |
|---|---|
| Daniel Fernandes Rodrigues | Gerente de Projeto |
| João Vicente Piller Menezes | Product Owner e Scrum Master |
| Lucas Dias Silveira | Desenvolvedor e Responsável por Configuração |
| Ana Laura Neuhaus Vega | Desenvolvedora |
| Bruno Taconi da Silva | Desenvolvedor |
| Karine Vitória Marinho de Moraes | Desenvolvedora |

## Licença

[MIT](LICENSE).
