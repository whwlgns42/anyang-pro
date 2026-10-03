import type { MetadataRoute } from "next";

// anyang-frontend-screens "PWA — manifest·서비스워커" 절. 아이콘 자산은 아직 없음(미확정) —
// 디자인 자산이 준비되면 icons 배열만 채운다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "안양 청년정책 비서",
    short_name: "안양비서",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F3ED",
    theme_color: "#F5F3ED",
    icons: [],
  };
}
