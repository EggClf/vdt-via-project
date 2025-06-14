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
    displayChart: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to display a visualization chart of the data, only true if user require it."
      ),
  }),
  execute: async ({ query, displayChart }) => {
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

      let chartConfig = null;
      // Only fetch chart configuration if displayChart is true
      if (displayChart) {
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

        if (chartResponse.ok) {
          chartConfig = await chartResponse.json();
        }
      }

      return {
        columns: result.columns || [],
        records: records,
        chartConfig: chartConfig,
        displayChart: displayChart,
        displayTable: !displayChart, // Pass the display preference to the UI
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
        displayChart: false,
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

// Create text to sql tool
export const TextToSQLTool = tool({
  description: "Convert natural language query to SQL query",
  parameters: z.object({
    query: z
      .string()
      .min(1, "Query cannot be empty")
      .describe(
        "The natural language query to convert into SQL. The output will be a valid SQL SELECT statement."
      ),
    context: z
      .string()
      .describe(
        "Optional context to help generate the SQL query. This can include information about the database schema, specific tables, column names"
      ),
  }),
  execute: async ({ query, context }) => {
    try {
      // Make a request to the /api/text-to-sql endpoint
      const response = await fetch(`${API_BASE_URL}/api/text2sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim(), context: context.trim() }),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Text to SQL Tool Error: ${
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          }`
        );
      }

      const result = await response.json();
      return {
        sqlQuery: result.sqlQuery || "",
      };
    } catch (error) {
      console.error("Error using Text to SQL Tool:", error);
      return {
        error: `Failed to convert text to SQL: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        sqlQuery: "",
      };
    }
  },
});
