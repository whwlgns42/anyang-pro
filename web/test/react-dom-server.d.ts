// @types/react-dom 없이 테스트에서 renderToStaticMarkup만 쓰기 위한 최소 선언(새 의존성 추가 없음).
declare module "react-dom/server" {
  export function renderToStaticMarkup(element: unknown): string;
}
