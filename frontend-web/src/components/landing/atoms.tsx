import * as React from 'react';
import Image from 'next/image';

type IconProps = { size?: number; className?: string };

export const Arrow = ({ size = 14, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

export const ArrowUpRight = ({ size = 14, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M7 17L17 7M8 7h9v9" />
  </svg>
);

export const Spark = ({ size = 14, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

export const StarIcon = ({
  size = 14,
  filled = true,
  className,
}: IconProps & { filled?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.5}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const Plus = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 12h14" />
  </svg>
);

/* ===== Brand mark — Σ-style sigma "PC" ===== */
export const BrandMark = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="8" fill="var(--pc-midnight)" />
    <path
      d="M9 9h14M9 9l7 7-7 7M9 23h14"
      stroke="var(--pc-sky)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ===== Photo placeholder ===== */
export type PhotoTone = 'sky' | 'midnight' | 'warm' | 'cool';

export const Photo = ({
  label,
  ratio = '4 / 3',
  tone = 'sky',
  src,
  alt = '',
  objectPosition,
  children,
  style,
  className = '',
}: {
  label?: string | null;
  ratio?: string | null;
  tone?: PhotoTone;
  src?: string;
  alt?: string;
  objectPosition?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const finalStyle: React.CSSProperties = {
    ...(ratio ? { aspectRatio: ratio } : {}),
    ...style,
  };
  return (
    <div
      className={`pc-photo ${className} ${src ? 'pc-photo-has-src' : ''}`}
      data-tone={tone}
      style={finalStyle}
    >
      {src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 760px) 100vw, 50vw"
          style={{
            objectFit: 'cover',
            objectPosition: objectPosition || 'center',
          }}
        />
      )}
      {children}
      {label && <span className="pc-photo-label">{label}</span>}
    </div>
  );
};

/* ===== Button (pill) ===== */
type BtnVariant = 'primary' | 'sky' | 'ghost';

export const PCButton = ({
  variant = 'primary',
  compact = false,
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  compact?: boolean;
}) => {
  const cls = [
    'pc-btn',
    `pc-btn-${variant}`,
    compact ? 'pc-btn-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
};

/* ===== Eyebrow pill ===== */
export const Eyebrow = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <span className="pc-h-eyebrow" style={style}>
    {children}
  </span>
);

/* ===== Chip ===== */
export const Chip = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <span className="pc-chip" style={style}>
    {children}
  </span>
);
