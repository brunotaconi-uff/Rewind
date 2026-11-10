import { createApp } from "./app";
import { getJwtSecret } from "./config/env";

getJwtSecret(); 

createApp().listen(3001, () => {
  console.log("Servidor rodando em http://localhost:3001");
});
