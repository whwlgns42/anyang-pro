import type { ButtonHTMLAttributes, ReactNode, SVGProps } from "react";

// 청안 react-prototype/Icon.tsx와 같은 모양(팀 자체 제작 선 아이콘). 안양 화면에서 쓰는 14개만 둔다(star는 청안에 없는 추가분).
export type IconName =
  | "chat"
  | "notices"
  | "bell"
  | "person"
  | "history"
  | "plus"
  | "send"
  | "chevron-right"
  | "chevron-left"
  | "external"
  | "share"
  | "pencil"
  | "trash"
  | "star";

const shapes: Record<IconName, ReactNode> = {
  chat: <path d="M4.5 5.5h15v10.5h-9l-4.5 3.5v-3.5h-1.5z" />,
  notices: (
    <>
      <path d="M6 3.5h8.5L18 7v13.5H6z" />
      <path d="M9 11h6M9 14.5h6M9 18h3.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.5 20.5c1.3-3.6 4.1-5.5 7.5-5.5s6.2 1.9 7.5 5.5" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M12 18V6M6.5 11.5L12 6l5.5 5.5" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  external: (
    <>
      <path d="M14 4.5h5.5V10M19.5 4.5L11 13" />
      <path d="M17.5 14v5.5h-13v-13H10" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v11M8 7.5l4-4 4 4" />
      <path d="M7 10.5H5.5v10h13v-10H17" />
    </>
  ),
  pencil: (
    <>
      <path d="M4.5 19.5l3.8-.9L19 7.9 16.1 5 5.4 15.7z" />
      <path d="M14 7l3 3" />
    </>
  ),
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2L17.5 7" />,
  star: <path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8 6.9 19.5l1-5.7-4.1-4 5.7-.8z" fill="currentColor" />,
};

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  /** 있으면 화면 낭독기가 읽는다. 없으면 장식으로 숨긴다 */
  label?: string;
};

export function Icon({ name, size = 22, strokeWidth = 1.6, label, className = "", ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {shapes[name]}
    </svg>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  /** 아이콘만 있는 버튼이라 이름이 꼭 필요하다 */
  label: string;
  iconSize?: number;
};

/** 44x44 터치 영역을 가진 아이콘 버튼 */
export function IconButton({ icon, label, iconSize = 22, className = "", ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex size-touch shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 text-ink ${className}`}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

