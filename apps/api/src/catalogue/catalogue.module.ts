import { Module } from "@nestjs/common";
import { CatalogueController } from "./catalogue.controller.js";
import { CatalogueRepository } from "./catalogue.repository.js";

@Module({
  controllers: [CatalogueController],
  providers: [CatalogueRepository],
})
export class CatalogueModule {}
