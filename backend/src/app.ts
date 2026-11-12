import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import { createAlbumRouter } from "./routes/album.routes";
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
		}),
	);

	app.use("/users", userRoutes);
	app.use("/albums", createAlbumRouter(musicProvider));
	app.use(createMusicRouter(musicProvider));

	app.use(notFoundHandler);
	app.use(errorHandler);

	return app;
}

// Ponto de entrada na Vercel: ela procura src/app.ts antes de src/server.ts e exige
// que o export default seja o app (uma função). Localmente quem sobe o servidor é o
// server.ts; os testes usam o createApp com um provider de música falso.
export default createApp();
