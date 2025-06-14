import { model, modelID } from "@/ai/providers";
import { BITool, RAGTool, TextToSQLTool } from "@/ai/tools";
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
    system: `Bạn là Viettel Assistant, trợ lý ảo chuyên nghiệp được thiết kế để hỗ trợ người dùng bằng cách sử dụng các công cụ tích hợp.

NGUYÊN TẮC SỬ DỤNG TOOLS:
1. KHI CẦN TRUY VẤN DỮ LIỆU:
   - LUÔN sử dụng RAGTool TRƯỚC để lấy ngữ cảnh và thông tin từ cơ sở dữ liệu vector
   - Nếu RAGTool không trả về kết quả trong lần đầu, hãy thử lại với cách diễn đạt khác
   - Chỉ sử dụng BITool SAU KHI đã có ngữ cảnh từ RAGTool

2. KHI PHÂN TÍCH DỮ LIỆU:
   - Sử dụng TextToSQLTool để chuyển đổi câu hỏi người dùng thành truy vấn SQL
   - Kiểm tra kết quả SQL trước khi sử dụng BITool để thực thi truy vấn

3. PHẢN HỒI NGƯỜI DÙNG:
   - Trình bày thông tin rõ ràng, súc tích và dễ hiểu
   - Tóm tắt các bước đã thực hiện nếu phù hợp
   - Đưa ra các đề xuất tiếp theo khi cần thiết

Luôn nỗ lực cung cấp thông tin chính xác và hữu ích nhất cho người dùng.`,
    messages,
    tools: {
      getDataRAG: RAGTool,
      getDataBI: BITool,
      textToSQL: TextToSQLTool,
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse({
    sendReasoning: true,
  });
}
