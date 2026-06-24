import { generateReadyImages } from "../services/imageGenerationService.js";
import { logger } from "../utils/logger.js";
import { WorkflowContext } from "./context.js";

export async function imageGenerateWorkflow(_context: WorkflowContext) {
  logger.info("Generating AI image drafts");
  return generateReadyImages(3);
}
