import { z } from "zod";

export interface JsonAiClient {
  generateJson<T>(
    prompt: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    attempts?: number
  ): Promise<T>;
}
