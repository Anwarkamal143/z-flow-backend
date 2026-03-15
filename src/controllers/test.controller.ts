import { CredentialType } from "@/db";
import { credentialService } from "@/services/credentails.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { generateSlug } from "random-word-slugs";

class InngestController {
  /**
   * Sends a demo event "demo/event.sent"
   */
  public async testPoint(_req: FastifyRequest, rep: FastifyReply) {
    try {
      const body = _req.body as Record<string, any>;
      const data = await credentialService.createCredentail({
        userId: body.userId,
        value: body.secret,
        type: CredentialType.ANTHROPIC,
        name: body.name || generateSlug(),
      });
      console.log(data, "response");
      rep.status(200).send(data.data);
    } catch (error) {
      console.error("Error sending demo event:", error);
      rep.status(500).send({ error: "Failed to send event" });
    }
  }
  public async testPoint2(_req: FastifyRequest, rep: FastifyReply) {
    try {
      const query = _req.query as Record<string, any>;
      const data = await credentialService.resolveById(query.id);
      console.log(data, "response");
      rep.status(200).send(data.data);
    } catch (error) {
      console.error("Error sending demo event:", error);
      rep.status(500).send({ error: "Failed to send event" });
    }
  }
}

// Export a singleton instance for route registration
export default new InngestController();
