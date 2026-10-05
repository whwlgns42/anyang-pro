import type { NextConfig } from "next";

// 이전 가능성 원칙: Vercel 전용 기능을 쓰지 않고 standalone 산출물로 어디서든 실행한다.
// (anyang-backend-api 10절, anyang-deployment-portability 원칙 3)
const nextConfig: NextConfig = {
  output: "standalone",
  // anyang-backend-api 10-1절(확인 항목 63) — 보안 응답 헤더 3종. 전체 CSP는 넣지 않는다.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
