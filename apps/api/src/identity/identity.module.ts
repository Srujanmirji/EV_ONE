import { Module } from "@nestjs/common";
import { ClerkGuard } from "./clerk.guard.js";
import { IdentityController } from "./identity.controller.js";

@Module({
  controllers: [IdentityController],
  providers: [ClerkGuard],
  exports: [ClerkGuard],
})
export class IdentityModule {}
