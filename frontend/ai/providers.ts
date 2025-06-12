import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { deepinfra } from "@ai-sdk/deepinfra";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

const languageModels = {
  "gemini-2.5-flash-preview-05-20": google("gemini-2.5-flash-preview-05-20"),
  "gemini-2.0-flash": google("gemini-2.0-flash"),
  "gpt-4o": openai("gpt-4o"),
  "gpt-4o-mini": openai("gpt-4o-mini"),
  "deepseek-ai/DeepSeek-R1": wrapLanguageModel({
    middleware: extractReasoningMiddleware({
      tagName: "think",
    }),
    model: deepinfra("deepseek-ai/DeepSeek-R1"),
  }),
};

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "gemini-2.0-flash";
