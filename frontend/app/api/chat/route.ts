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
    system: `Bạn là trợ lý ảo Viettel Assistant,chuyên cung cấp thông tin và hỗ trợ người dùng bằng việc sử dụng tools,
      Nếu bạn cần sử dụng BITool thì hãy sử dụng RAGTool trước để lấy thông tin các bảng.
      Nếu bạn cần sử dụng RAGTool thì hãy nhớ thử lại nếu không có kết quả trả về.`,
    messages,
    tools: {
      getDataRAG: RAGTool,
      getDataBI: BITool,
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse({
    sendReasoning: true,
  });
}
