import { IdentityModule } from "../identity/identity.module.js";
import { CatalogueEditorController } from "./catalogue-editor.controller.js";
import { CatalogueEditorService } from "./catalogue-editor.service.js";
import { Module } from "@nestjs/common";
import { CatalogueController } from "./catalogue.controller.js";
import { CatalogueRepository } from "./catalogue.repository.js";

@Module({
  imports: [IdentityModule],
  controllers: [CatalogueController, CatalogueEditorController],
  providers: [CatalogueRepository, CatalogueEditorService],
})
export class CatalogueModule {}
