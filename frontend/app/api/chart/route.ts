"use server";
import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

import { generateObject } from "ai";

export const generateChartConfig = async (
  results: Result[],
  userQuery: string
) => {
  const system = `You are a data visualization expert.`;

  try {
    const { object: config } = await generateObject({
      model: openai("gpt-4o-mini"),
      system,
      prompt: `Dựa trên dữ liệu sau đây từ kết quả truy vấn SQL, hãy tạo cấu hình biểu đồ phù hợp nhất để trực quan hóa dữ liệu và trả lời câu hỏi của người dùng.
                Đối với nhiều nhóm dữ liệu, hãy sử dụng đồ thị đa đường.

                Đây là ví dụ về một cấu hình hoàn chỉnh:
                export const chartConfig = {
                type: "pie",
                xKey: "month",
                yKeys: ["sales", "profit", "expenses"],
                colors: {
                    sales: "#4CAF50",    // Màu xanh lá cho doanh số
                    profit: "#2196F3",   // Màu xanh dương cho lợi nhuận
                    expenses: "#F44336"  // Màu đỏ cho chi phí
                },
                legend: true
                }

                Câu hỏi của người dùng:
                ${userQuery}

                Dữ liệu:
                ${JSON.stringify(results, null, 2)}`,
      schema: configSchema,
    });

    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });

    const updatedConfig: Config = { ...config, colors };
    return { config: updatedConfig };
  } catch (e) {
    console.error("Chart generation error:", e);
    throw new Error("Failed to generate chart suggestion");
  }
};
export async function POST(req: Request) {
  try {
    const { query, results } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Results are required and must be an array" },
        { status: 400 }
      );
    }

    // Generate chart configuration based on the query and results
    const chartConfig = await generateChartConfig(results, query);

    return NextResponse.json(chartConfig);
  } catch (error) {
    console.error("Error generating chart configuration:", error);
    return NextResponse.json(
      { error: "Failed to generate chart configuration" },
      { status: 500 }
    );
  }
}
