import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Button.module.css";

/**
 * Bouton du site.
 * - `primary` : pilule blanche, action principale.
 * - `glass`   : effet « liquid glass » (styles .glass dans globals.css).
 * Avec `href`, rend un lien Next ; sinon un <button>.
 */

type Variant = "primary" | "glass";
type Size = "md" | "lg" | "sm";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type LinkButtonProps = CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">;
type NativeButtonProps = CommonProps & { href?: undefined } & Omit<ComponentProps<"button">, "className">;

export type ButtonProps = LinkButtonProps | NativeButtonProps;

function classes(variant: Variant, size: Size, extra?: string) {
  return [styles.button, styles[variant], styles[size], variant === "glass" ? "glass" : "", extra ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const cls = classes(variant, size, className);

  if (props.href !== undefined) {
    const { variant: _v, size: _s, className: _c, children: _ch, ...linkProps } = props;
    return (
      <Link {...linkProps} className={cls}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, href: _h, type = "button", ...buttonProps } = props;
  return (
    <button {...buttonProps} type={type} className={cls}>
      {children}
    </button>
  );
}
