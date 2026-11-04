import { Module } from "@nestjs/common";
import { AuthorizationService } from "./authorization.service.js";
import { PermissionGuard } from "./permission.guard.js";
import { ClerkGuard } from "./clerk.guard.js";
import { IdentityController } from "./identity.controller.js";

@Module({
  controllers: [IdentityController],
  providers: [ClerkGuard, PermissionGuard, AuthorizationService],
  exports: [ClerkGuard, PermissionGuard, AuthorizationService],
})
export class IdentityModule {}
