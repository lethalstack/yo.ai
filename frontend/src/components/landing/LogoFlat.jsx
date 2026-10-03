/* Flat, static YO mark — same geometry as LogoMark, no animation.
   White on dark themes, charcoal on light — via the existing .light class. */
import { useTheme } from "../../context/ThemeContext";

const PIECES = [
  "M340 263H428V402L507 484V263H604V710L428 530V600L604 832V983L362 662L340 636Z",
  "M641 263H760V353H727V718L760 678V822L641 973Z",
  "M781 263H901V636L781 795V648L816 602V353H781Z",
];

export default function LogoFlat({ size = 24, className, style }) {
  const { theme } = useTheme();
  const fill = theme === "light" ? "#1a1a1a" : "#ffffff";
  return (
    <svg
      viewBox="320 243 601 760"
      width={size}
      role="img"
      aria-label="yo"
      className={className}
      style={{ display: "block", height: "auto", ...style }}
    >
      {PIECES.map((d, i) => (
        <path key={i} d={d} fill={fill} />
      ))}
    </svg>
  );
}