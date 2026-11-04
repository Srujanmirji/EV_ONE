import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { MediaController } from "./media.controller.js";
import { MediaService } from "./media.service.js";
import { MediaStorage } from "./storage.js";

@Module({
  imports: [IdentityModule],
  controllers: [MediaController],
  providers: [MediaService, MediaStorage],
})
export class MediaModule {}
