import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { ListingController } from "./listing.controller.js";
import { ListingService } from "./listing.service.js";
@Module({
  imports: [IdentityModule],
  controllers: [ListingController],
  providers: [ListingService],
})
export class MarketplaceModule {}
