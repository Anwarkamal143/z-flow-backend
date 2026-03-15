import { APP_CONFIG, ENVIRONMENTS } from "@/config/app.config";
import { Inngest } from "inngest";
import { schemas } from "./types";
export const inngest = new Inngest({
  id: "zFlow",
  schemas,
  ...(ENVIRONMENTS.isProduction && {
    eventKey: process.env.INNGEST_EVENT_KEY!,
    signingKey: process.env.INNGEST_SIGNING_KEY,
  }),
  env: APP_CONFIG.INNGEST_MODE,
});
