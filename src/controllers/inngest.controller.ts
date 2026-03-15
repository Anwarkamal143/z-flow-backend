import { FastifyReply, FastifyRequest } from "fastify";

class InngestController {
  /**
   * Sends a demo event "demo/event.sent"
   */
  public async sendDemo(_req: FastifyRequest, rep: FastifyReply) {
    try {
      rep.status(200).send({ message: "Event sent!" });
    } catch (error) {
      console.error("Error sending demo event:", error);
      rep.status(500).send({ error: "Failed to send event" });
    }
  }
}

// Export a singleton instance for route registration
export default new InngestController();
