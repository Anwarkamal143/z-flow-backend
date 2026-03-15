// Import with `import * as Sentry from "@sentry/node"` if you are using ESM

import Sentry from "@sentry/node";
import { FastifyInstance } from "fastify";
import { APP_CONFIG } from "./config/app.config";

Sentry.init({
  dsn: APP_CONFIG.SENTRY_DNS!,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [
    Sentry.pinoIntegration({ error: { levels: ["warn", "error"] } }),
    // Add the Vercel AI SDK integration
    Sentry.vercelAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
  tracesSampleRate: 1.0,
  environment: APP_CONFIG.NODE_ENV,
});
export default function setUpSentry(app: FastifyInstance) {
  Sentry.setupFastifyErrorHandler(app as any);
}
