import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // As migrations usam a conexão direta quando existe (o Neon da Vercel define
    // DATABASE_URL_UNPOOLED); o app usa a DATABASE_URL, que passa pelo pooler.
    url: process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"],
  },
});
