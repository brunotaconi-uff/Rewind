import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import albumRoutes from "./routes/album.routes";
import musicRoutes from "./routes/music.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { getJwtSecret } from "./config/env";

getJwtSecret();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRoutes);
app.use("/albums", albumRoutes);
app.use(musicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(3001, () => {
  console.log("Servidor rodando em http://localhost:3001");
});