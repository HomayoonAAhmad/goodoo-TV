import type { SVGProps } from "react";

export function BrandLogo({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 314 342"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <use href="/brand/popcorn.svg#popcorn" />
    </svg>
  );
}
