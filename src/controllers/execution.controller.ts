import { HTTPSTATUS } from "@/config/http.config";
import { InsertExecution } from "@/schema/executions";
import {
  executionService,
  ExecutionsPaginationConfig,
} from "@/services/execution";
import { BadRequestException } from "@/utils/catch-errors";
import { SuccessResponse } from "@/utils/requestResponse";
import { FastifyReply, FastifyRequest } from "fastify";

class ExecutionController {
  async create(
    req: FastifyRequest<{ Body: InsertExecution }>,
    rep: FastifyReply,
  ) {
    const body = req.body;
    const data = await executionService.createExecution({
      ...body,
      userId: req.user!.id,
    });
    if (data.error) {
      throw data.error;
    }
    return SuccessResponse(rep, {
      message: "execution created successfully",
      data: data.data,
      statusCode: HTTPSTATUS.CREATED,
    });
  }
  public async getById(
    req: FastifyRequest<{ Params: { id: string } }>,
    _rep: FastifyReply,
  ) {
    const id = req.params.id;
    const userId = req.user?.id;
    if (!(id || "").trim()) {
      throw new BadRequestException("Id is required");
    }
    const execution = await executionService.getOneExecution(
      id,
      userId as string,
    );
    if (execution.error) {
      throw execution.error;
    }

    return SuccessResponse(_rep, {
      message: "execution found",
      data: execution.data,
    });
  }
  async list(
    req: FastifyRequest<{ Querystring: ExecutionsPaginationConfig }>,
    rep: FastifyReply,
  ) {
    const userId = req.user!.id;
    const result = await executionService.listPaginatedForExecutions(
      userId,
      req.query,
    );
    if (result.error) {
      throw result.error;
    }
    return SuccessResponse(rep, {
      message: "Executions found",
      data: result.data,
    });
  }
}

export default new ExecutionController();
