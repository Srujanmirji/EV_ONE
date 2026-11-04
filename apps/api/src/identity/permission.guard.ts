import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AccessPathParams } from "@evone/contracts";
import { parseRequest } from "../common/validation.js";
import { requestIdOf } from "../common/request-id.js";
import { AuthorizationService } from "./authorization.service.js";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly authorization: AuthorizationService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.authenticatedActor)
      throw new UnauthorizedException("Authentication required");
    const { scope, scopeId } = parseRequest(AccessPathParams, req.params);
    const allowed = await this.authorization.check(
      req.authenticatedActor,
      scope,
      scopeId,
      requestIdOf(req),
    );
    if (!allowed) throw new ForbiddenException("Access denied");
    return true;
  }
}
