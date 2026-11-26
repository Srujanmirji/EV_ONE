import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { MediaModule } from "../media/media.module.js";
import { ListingController } from "./listing.controller.js";
import { ListingService } from "./listing.service.js";
import { PublicListingController } from "./public-listing.controller.js";
import { PublicListingRepository } from "./public-listing.repository.js";

@Module({
  imports: [IdentityModule, MediaModule],
  controllers: [PublicListingController, ListingController],
  providers: [PublicListingRepository, ListingService],
})
export class MarketplaceModule {}
