import { workflowService } from "@/services/workflow.service";
import AppError from "@/utils/app-error";
import {
  BadRequestException,
  InternalServerException,
} from "@/utils/catch-errors";
import { SuccessResponse } from "@/utils/requestResponse";
import { FastifyReply, FastifyRequest } from "fastify";

class WebhooksController {
  public async googleForm(
    req: FastifyRequest<{
      Body: Record<string, any>;
      Querystring: { workflowId: string; secret: string };
    }>,
    rep: FastifyReply,
  ) {
    try {
      const workflowId = req.query.workflowId;
      const secret = req.query.secret;
      if (!workflowId || !secret) {
        throw new BadRequestException("Missing required query parameters");
      }
      const body = req.body;
      const formData = {
        formId: body.formId,
        formTitle: body.formTitle,
        responseId: body.responseId,
        timestamp: body.timestamp,
        respondentEmail: body.respondentEmail,
        responses: body.responses,
        raw: body,
      };
      if (!workflowId) {
        throw new BadRequestException(
          "Missing required query parameter: workflowId",
        );
      }
      const resp = await workflowService.executeWebhookWorkflow(
        workflowId,
        secret,
        {
          googleForm: formData,
        },
      );
      if (resp.error) {
        throw resp.error;
      }
      return SuccessResponse(rep, {
        data: resp.data,
        message: "Worklow is executing",
      });
    } catch (error: any) {
      console.log(error.messae, "errorMessage");
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Google form webhook error:", error);
      throw new InternalServerException(
        "Failed to process Google Form submission",
      );
    }
  }
  public async stripeEvent(
    req: FastifyRequest<{
      Body: Record<string, any>;
      Querystring: { workflowId: string; secret: string };
    }>,
    rep: FastifyReply,
  ) {
    try {
      const body = req.body;
      const workflowId = req.query.workflowId;
      const secret = req.query.secret;
      if (!workflowId || !secret) {
        throw new BadRequestException("Missing required query parameters");
      }

      const formData = {
        eventId: body.id,
        eventType: body.type,
        timestamp: body.created,
        livemode: body.livemode,
        raw: body.data?.object,
      };

      const resp = await workflowService.executeWebhookWorkflow(
        workflowId,
        secret,
        {
          stripe: formData,
        },
      );
      if (resp.error) {
        throw resp.error;
      }
      return SuccessResponse(rep, {
        data: resp.data,
        message: "Worklow is executing",
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerException("Failed to process Stripe event");
    }
  }
}

export default new WebhooksController();
