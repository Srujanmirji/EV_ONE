import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { API_CONFIG } from "../config/config.token.js";
import type { ApiConfig } from "../config/env.js";
import { verifyActor, type AuthenticatedActor } from "./verify.js";

declare module "express" {
  interface Request {
    authenticatedActor?: AuthenticatedActor;
  }
}

@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    res.setHeader("Cache-Control", "no-store");
    delete req.authenticatedActor;
    const authorization = req.header("Authorization") ?? "";
    const count = req.rawHeaders.filter(
      (value, index) =>
        index % 2 === 0 && value.toLowerCase() === "authorization",
    ).length;
    const bearer =
      authorization.length <= 8200 && count === 1
        ? /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(
            authorization,
          )?.[1]
        : undefined;
    const actor = bearer ? await verifyActor(bearer, this.config.auth) : null;
    if (!actor) {
      res.setHeader("WWW-Authenticate", "Bearer");
      throw new UnauthorizedException("Authentication required");
    }
    req.authenticatedActor = actor;
    return true;
  }
}
