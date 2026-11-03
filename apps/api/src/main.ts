import { ConfigError, loadConfig } from "./config/env.js";
import { createApp } from "./create-app.js";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const app = await createApp({ config });
  await app.listen(config.API_PORT, config.API_HOST);
  console.log(
    `EVONE API listening on http://${config.API_HOST}:${config.API_PORT}`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) {
    console.error(error.message);
  } else {
    console.error("EVONE API failed to start", error);
  }
  process.exit(1);
});
