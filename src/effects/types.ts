// ripple types
export type TRippleMode = "keep" | "unkeep";

export type TRipplePosition =
  | "cursor"
  | "center"
  | "random"
  | "top"
  | "bottom"
  | "right"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left-top"
  | "left-bottom"
  | "right-top"
  | "right-bottom"
  | "cs"
  | "ct"
  | "rd"
  | "t"
  | "r"
  | "b"
  | "l"
  | "tl"
  | "tr"
  | "bl"
  | "br"
  | "lt"
  | "lb"
  | "rt"
  | "rb";

export type TRippleOption = {
  event: string;
  background: string;
  duration: string;
  timingFunction: string;
  mode: TRippleMode;
  position: TRipplePosition;
  delay: string;
  sizeRatio: number;
  repeatCount: number;
  repeatInterval: string;
  maxCount: number;
  outline: string;
  boxShadow: string;
};
