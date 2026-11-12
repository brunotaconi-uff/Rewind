import type { SVGProps } from "react";

// Ícones de traço em SVG inline, sem dependência externa. Herdam a cor do texto (currentColor).

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.5-4.5" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z" />
    </Icon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20z" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c0-3.9 3.4-6.5 7.5-6.5s7.5 2.6 7.5 6.5" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.4 2.8-5.8 6.5-5.8s6.5 2.4 6.5 5.8" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.8M18 14.5c2.1.9 3.5 2.8 3.5 5.5" />
    </Icon>
  );
}

/** Caixa de álbum com nota musical: "marcar como ouvido". */
export function ListenedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3.5h10" />
      <rect x="3.5" y="6.5" width="17" height="14" rx="3" />
      <circle cx="10.5" cy="16" r="1.8" />
      <path d="M12.3 16v-5.5l3.2.8" />
    </Icon>
  );
}

/** Balão com linhas: "fazer review". */
export function ReviewIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z" />
      <path d="M8 8.5h8M8 12h5" />
    </Icon>
  );
}

/** Porta com seta para fora: "sair". */
export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5" />
      <path d="M16 16.5 20.5 12 16 7.5M20.5 12H9.5" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}
