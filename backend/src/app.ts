import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import albumRoutes from "./routes/album.routes";
import { createMusicRouter } from "./routes/music.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { UPLOADS_DIR } from "./services/avatar.service";
import { getMusicProvider } from "./services/music/music.provider";
import type { MusicProvider } from "./services/music/music.types";

export function createApp(musicProvider: MusicProvider = getMusicProvider()) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(
    "/uploads",
    express.static(UPLOADS_DIR, {
      setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
    })
  );

  app.use("/users", userRoutes);
  app.use("/albums", albumRoutes);
  app.use(createMusicRouter(musicProvider));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
