"use server";
import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

import { generateObject, generateText } from "ai";

const generateSql = async (query: string, context: string) => {
  const system = `You are an expert SQL query generator. 
  Convert natural language queries into valid SQL SELECT statements.
  Focus on clarity, efficiency, and accuracy.
  Always use proper SQL syntax and follow best practices.`;

  try {
    const sqlQuery = await generateText({
      model: openai("gpt-4o-mini"),
      system,
      prompt: `Convert the following natural language query to a valid SQL SELECT statement:
      
      "${query}"
      Context for the query:
      "${context}"
      Return only the SQL query without any additional explanations or comments.`,
      temperature: 0.2, // Lower temperature for more deterministic outputs
    });

    return {
      sqlQuery: sqlQuery,
      success: true,
    };
  } catch (e) {
    console.error("SQL generation error:", e);
    throw new Error("Failed to generate SQL query");
  }
};

export async function POST(req: Request) {
  try {
    const { query, context } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const sqlQuery = await generateSql(query, context);

    return NextResponse.json(sqlQuery);
  } catch (error) {
    console.error("Error generating SQL query:", error);
    return NextResponse.json(
      { error: "Failed to generate SQL query" },
      { status: 500 }
    );
  }
}
