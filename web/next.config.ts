import type { NextConfig } from "next";

// 이전 가능성 원칙: Vercel 전용 기능을 쓰지 않고 standalone 산출물로 어디서든 실행한다.
// (anyang-backend-api 10절, anyang-deployment-portability 원칙 3)
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
