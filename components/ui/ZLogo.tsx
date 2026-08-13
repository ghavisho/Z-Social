/**
 * Z Logo — a simple geometric zigzag mark (echoing the letter "Z" as a
 * single continuous connecting path), rendered in Z's purple. Deliberately
 * reductive so it works at favicon size, as an app icon, and on the splash
 * screen. Not derived from any existing brand mark.
 */
export function ZLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Z"
    >
      <rect width="48" height="48" rx="14" fill="#6E3AD1" />
      <path
        d="M14 14H34L14 34H34"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
