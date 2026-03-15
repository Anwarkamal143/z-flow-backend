import { HTTPSTATUS } from "@/config/http.config";
import { ICredentialType } from "@/db";
import { ICreateCredential, IUpdateCredential } from "@/schema/credentials";
import {
  CredentialPaginationConfig,
  credentialService,
} from "@/services/credentails.service";
import { BadRequestException } from "@/utils/catch-errors";
import { SuccessResponse } from "@/utils/requestResponse";
import { FastifyReply, FastifyRequest } from "fastify";

class InngestController {
  public async create(
    req: FastifyRequest<{ Body: ICreateCredential }>,
    rep: FastifyReply,
  ) {
    const body = req.body;
    const data = await credentialService.createCredentail({
      ...body,
      userId: req.user!.id,
    });
    if (data.error) {
      throw data.error;
    }
    return SuccessResponse(rep, {
      message: "credential saved securely",
      data: data.data,
      statusCode: HTTPSTATUS.CREATED,
    });
  }

  public async update(
    req: FastifyRequest<{ Body: IUpdateCredential }>,
    rep: FastifyReply,
  ) {
    const body = req.body;
    const userId = req.user?.id as string;

    const data = await credentialService.updateCredentialData({
      input: {
        ...body,
        userId,
      },
    });
    if (data.error) {
      throw data.error;
    }
    return SuccessResponse(rep, {
      message: "credential saved securely",
      data: data.data,
      statusCode: HTTPSTATUS.OK,
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
    const credential = await credentialService.getById(id, userId as string);
    if (credential.error) {
      throw credential.error;
    }

    return SuccessResponse(_rep, {
      message: "credential found",
      data: credential.data,
    });
  }
  public async deleteById(
    req: FastifyRequest<{ Params: { id: string } }>,
    _rep: FastifyReply,
  ) {
    const id = req.params.id;
    const userId = req.user?.id;

    const credential = await credentialService.deleteById(id, userId);
    if (credential.error) {
      throw credential.error;
    }

    return SuccessResponse(_rep, {
      message: "credential deleted",
      data: credential.data?.[0],
    });
  }
  public async getAll(
    req: FastifyRequest<{
      Querystring: CredentialPaginationConfig;
    }>,
    _rep: FastifyReply,
  ) {
    const userId = req.user!.id;
    const validaionResult = credentialService.validateQuery(req.query, {
      search: "name",
      filters() {
        return [{ column: "userId", operator: "eq", value: userId }];
      },
    }) as CredentialPaginationConfig;
    const result = await credentialService.listAllPaginatedCredentials({
      ...validaionResult,
    });
    if (result.error) {
      throw result.error;
    }
    return SuccessResponse(_rep, {
      message: "Credentials found",
      data: result.data,
    });
  }
  public async getByType(
    req: FastifyRequest<{
      Querystring: { type: ICredentialType };
    }>,
    _rep: FastifyReply,
  ) {
    const userId = req.user!.id;
    const result = await credentialService.getByType(req.query.type, userId);
    if (result.error) {
      throw result.error;
    }
    return SuccessResponse(_rep, {
      message: "Credentials found",
      data: result.data,
    });
  }
}

// Export a singleton instance for route registration
export default new InngestController();
