# Rewind

O **Rewind** é uma rede social voltada para os amantes de música que desejam transformar a escuta individual em uma experiência interativa e compartilhada. Inspirado em plataformas como o Letterboxd, o projeto oferece um espaço dedicado para catalogar álbuns, escrever resenhas e explorar recomendações fora dos algoritmos tradicionais de streaming.

Este projeto está sendo desenvolvido como trabalho prático para a disciplina de **Gerência de Projeto e Manutenção de Software (GPMS - TCC00363)**, ministrada pela Professora Rebeca Motta na Universidade Federal Fluminense (UFF).

## Principais Funcionalidades

- **Busca e Catalogação:** Pesquisa de álbuns e artistas com metadados completos integrados via API pública (ex: Spotify/Last.fm).
- **Diário de Escuta (Log):** Registro de audições com notas de 1 a 5 estrelas e resenhas críticas.
- **Listas Temáticas:** Criação de listas personalizadas de álbuns (ex: "Melhores do Ano", "Para Estudar").
- **Feed Social:** Acompanhamento das atividades de amigos e pessoas com gosto musical semelhante.
- **Perfil de Usuário:** Espaço personalizável para exibir álbuns favoritos e histórico de escuta.

## Tecnologias Utilizadas

Este projeto foi inicializado com uma arquitetura moderna e padronizada:
- **[Next.js]**
- **[React]** 
- **[TypeScript]**
- **CSS Modules**
- **[Node.js]**
- **[Express]**
- **[Prisma]**
- **[Docker]**
- **[PostgreSQL]**

## Como Executar o Projeto Localmente

### Pré-requisitos
Antes de começar, certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/en/) (versão 18 ou superior)
- [Git](https://git-scm.com/) (para versionamento e clonagem)
- [Docker](https://www.docker.com/) (para conteinirização do banco de dados)

### Passos para rodar o Front-end

**Clone o repositório:**
   ```bash
   git clone https://github.com/lucasilvr/Rewind.git
   ```
Acesse o projeto e rode: 
```npm install```

Crie um arquivo .env na raiz do projeto (veja o .env.example):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="sua-chave-secreta"
```

Para gerar as chaves secretas (NEXTAUTH_SECRET e JWT_SECRET): ```node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"```

Depois inicie o servidor localmente: ```npm run dev```


### Passos para rodar o Back-end
#### Instalação

Acesse a pasta do backend: ```cd backend```

Instale as dependências: ```npm install```

#### Configuração do ambiente

Crie um arquivo .env dentro da pasta "backend":
```
DATABASE_URL="postgresql://rewind:rewind@localhost:5432/rewind"
JWT_SECRET="sua-chave-secreta"
```

#### Banco de dados

Inicie o PostgreSQL utilizando o Docker Compose: ```docker compose up -d```

Em seguida, execute as migrations do Prisma: ```npx prisma migrate dev```

Gere o Prisma Client: ```npx prisma generate```

#### Execução

Inicie o servidor de desenvolvimento: ```npm run dev```

O back-end estará disponível em: http://localhost:3001