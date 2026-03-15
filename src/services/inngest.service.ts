import { EventDataMap, EventMap, EventNames } from "@/app_inngest/types";
import fastify from "@/server"; // Your Fastify instance
import { generateUlid } from "@/utils";

export class InngestService {
  /**
   * Send a typed event using the global Inngest client.
   */
  async send<Name extends EventNames>(params: {
    name: Name;
    data: EventDataMap[Name];
  }) {
    try {
      return await fastify.inngest.send({
        name: params.name,
        data: params.data,
        id: generateUlid(),
      } as EventMap[Name]);
    } catch (error) {
      console.error("Error sending Inngest event: ", error);
      throw error;
    }
  }

  /**
   * Convenience wrapper ONLY for events with `{ message: string }`
   * e.g. "demo/event.sent"
   */
  async sendDemoMessage<Name extends EventNames>(
    name: Name,
    data: EventDataMap[Name],
  ) {
    return await this.send({
      name,
      data,
    });
  }
}

export const inngestService = new InngestService();
