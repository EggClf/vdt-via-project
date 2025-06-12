import { model, modelID } from "@/ai/providers";
import { BITool, RAGTool } from "@/ai/tools";
import { streamText, UIMessage } from "ai";
import { get } from "http";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    selectedModel,
  }: { messages: UIMessage[]; selectedModel: modelID } = await req.json();

  const result = streamText({
    model: model.languageModel(selectedModel),
    system: `Bạn là trợ lý ảo Viettel Assistant,chuyên cung cấp thông tin và hỗ trợ người dùng,
      Nếu bạn cần sử dụng BITool thì hãy sử dụng RAGTool trước để lấy thông tin các bảng.
      Sau đó tạo SQL query. 
      Bạn cần lọc lại các trường cần thiết để tạo SQL query. 
      Bạn cần đưa ra các bước suy luận.
      Sau khi dùng BITool, bạn sẽ nói: Đây là kết quả của câu hỏi của bạn.`,
    messages,
    tools: {
      getDataRAG: RAGTool,
      getDataBI: BITool,
    },
  });

  return result.toDataStreamResponse({
    sendReasoning: true,
  });
}

import { tool } from "ai";
import { object, z } from "zod";

// Define API base URL as a constant for easier configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

export const BITool = tool({
  description: "Get data from a BI tool",
  parameters: z.object({
    query: z
      .string()
      .min(1, "Query cannot be empty")
      .refine((q) => q.trim().toUpperCase().startsWith("SELECT"), {
        message: "Only SELECT queries are allowed",
      })
      .describe(
        'The query to get data from the BI tool, you only accept SELECT queries, and note that table name follow this format: `public."table_name"`. '
      ),
  }),
  execute: async ({ query }) => {
    try {
      // Make a request to the /api/bi endpoint
      const response = await fetch(`${API_BASE_URL}/api/bi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `BI Tool Error: ${
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          }`
        );
      }

      // Get query results
      const result = await response.json();
      const records = result.records as Record<string, string | number>[];

      // Generate chart configuration based on the query and results
      const chartResponse = await fetch(`${API_BASE_URL}/api/chart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          results: records,
        }),
        cache: "no-store",
      });

      let chartConfig = null;
      if (chartResponse.ok) {
        chartConfig = await chartResponse.json();
      }

      return {
        columns: result.columns || [],
        records: records,
        chartConfig: chartConfig,
      };
    } catch (error) {
      console.error("Error using BI Tool:", error);
      return {
        error: `Failed to fetch data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        columns: [],
        records: [],
        chartConfig: null,
      };
    }
  },
});

export const RAGTool = tool({
  description:
    "Lấy ngữ cảnh từ kho dữ liệu vector để trả lời câu hỏi của người dùng.",
  parameters: z.object({
    query: z
      .string()
      .min(1, "Query cannot be empty")
      .describe(
        `Câu query để lấy ngữ cảnh từ kho dữ liệu vector. Lưu ý: query nên align với các bảng trong kho dữ liệu vector .`
      ),
  }),
  execute: async ({ query }) => {
    try {
      // Make a request to the /api/rag endpoint
      const response = await fetch(`${API_BASE_URL}/api/rag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `RAG Tool Error: ${
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          }`
        );
      }

      const result = await response.json();
      return {
        documents: result.documents || [],
        documentCount: (result.documents || []).length,
        rawResult: result,
      };
    } catch (error) {
      console.error("Error using RAG Tool:", error);
      return {
        error: `Failed to fetch data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        documents: [],
        documentCount: 0,
      };
    }
  },
});
