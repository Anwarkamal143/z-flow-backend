import { APP_CONFIG } from "@/config/app.config";
import setUpSentry from "./instrument";

import { buildApp } from "./app";
import { setupShutdownHandlers } from "./utils/shutdown";

const port = Number(APP_CONFIG.PORT || 4000);

let fastify = buildApp();
const start = async () => {
  const server = await fastify;
  setUpSentry(server);
  try {
    await server.listen({ port, host: "0.0.0.0" });
    server.log.info(`Server listening on ${port}`);
    // handle graceful shutdown
    setupShutdownHandlers(server);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
  return server;
};
start();
export default fastify;
