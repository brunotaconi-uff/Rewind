import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import albumRoutes from "./routes/album.routes";
import musicRoutes from "./routes/music.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { UPLOADS_DIR } from "./services/avatar.service";

const app = express();

app.use(cors());
app.use(express.json());

// Fotos de perfil enviadas pelos usuários. O nosniff impede o navegador de
// tratar um arquivo como outra coisa além do tipo da extensão.
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

app.use("/users", userRoutes);
app.use("/albums", albumRoutes);
app.use(musicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(3001, () => {
  console.log("Servidor rodando em http://localhost:3001");
});