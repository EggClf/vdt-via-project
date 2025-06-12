import { NextResponse } from "next/server";

// POST endpoint for direct data queries (non-streaming)
export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Calling the BITool directly for data queries
    const response = await fetch("http://localhost:8000/context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: query }),
    });

    return response;
  } catch (error) {
    console.error("Error fetching BI data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
