import { APP_CONFIG, ENVIRONMENTS } from "@/config/app.config";
import { Polar } from "@polar-sh/sdk";

export class PolarService extends Polar {
  constructor() {
    super({
      accessToken: APP_CONFIG.POLAR_ACCESS_TOKEN!,
      server: !ENVIRONMENTS.isProduction ? "sandbox" : "production",
    });
  }
}

export default new PolarService();
