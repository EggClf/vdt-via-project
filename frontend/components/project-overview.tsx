import NextLink from "next/link";
export const ProjectOverview = () => {
  return (
    <div className="flex flex-col items-center justify-end">
      <h1 className="text-3xl font-semibold mb-4">
        Chatbot hỏi đáp thông tin báo cáo BI
      </h1>
      <p className="text-center">
        Đồ án này sử dụng mô hình ngôn ngữ lớn (LLM) để tạo ra một chatbot có
        khả năng trả lời các câu hỏi liên quan đến báo cáo BI.
      </p>
    </div>
  );
};

const Link = ({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <NextLink
      target="_blank"
      className="text-blue-500 hover:text-blue-600 transition-colors duration-75"
      href={href}
    >
      {children}
    </NextLink>
  );
};
