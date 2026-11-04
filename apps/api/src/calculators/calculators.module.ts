import { Module } from "@nestjs/common";
import { CalculatorsController } from "./calculators.controller.js";

@Module({ controllers: [CalculatorsController] })
export class CalculatorsModule {}
