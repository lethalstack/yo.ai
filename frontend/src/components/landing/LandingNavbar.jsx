import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoFlat from "./LogoFlat";

const LINKS = [
  { label: "Product", href: "#what" },
  { label: "Chat", href: "#ask" },
  { label: "Study", href: "#drop" },
  { label: "Modes", href: "#modes" },
];

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="border-b border-[var(--yol-border)] bg-[color-mix(in_srgb,var(--yol-bg)_82%,transparent)] backdrop-blur-xl">
        <nav className="px-6 lg:px-10 h-14 flex items-center justify-between">
          {/* LEFT GROUP — logo + links, anchored to the left edge */}
          <div className="flex items-center gap-7 lg:gap-9">
            <Link
              to="/"
              aria-label="yo — home"
              className="flex items-center outline-none focus-visible:ring-1 focus-visible:ring-[var(--yol-fg)] rounded"
            >
              <LogoFlat size={16} />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-[13px] text-[var(--yol-muted)] hover:text-[var(--yol-fg)] transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT GROUP — CTA + real profile, anchored to the right edge */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/loading?to=/app"
              className="text-[13px] font-medium px-5 py-2 rounded-full bg-[var(--yol-accent)] text-[var(--yol-accent-fg)] hover:opacity-85 active:scale-[0.98] transition-all"
            >
              Open YO →
            </Link>

            {user && (
              <Link
                to="/app"
                title={user.display_name || user.email}
                aria-label="Your workspace"
                className="shrink-0 rounded-full outline-none focus-visible:ring-1 focus-visible:ring-[var(--yol-fg)]"
              >
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-[var(--yol-border)]"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full border border-[var(--yol-border)] bg-[var(--yol-surface-2)] flex items-center justify-center text-[12px] text-[var(--yol-muted)]">
                    {(user.display_name || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            )}
          </div>

          {/* mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-[var(--yol-fg)]"
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {/* mobile menu */}
        {open && (
          <div className="md:hidden px-6 pb-5 border-t border-[var(--yol-border)]">
            <div className="flex flex-col pt-3">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-2.5 text-[14px] text-[var(--yol-muted)] hover:text-[var(--yol-fg)] transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3">
              {user ? (
                <Link to="/app" onClick={() => setOpen(false)} className="flex items-center gap-2.5 min-w-0">
                  {user.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-[var(--yol-border)]"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full border border-[var(--yol-border)] bg-[var(--yol-surface-2)] flex items-center justify-center text-[12px] text-[var(--yol-muted)]">
                      {(user.display_name || user.email || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-[12px] text-[var(--yol-muted)] truncate max-w-[140px]">
                    {user.display_name || user.email}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              <Link
                to="/loading?to=/app"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full bg-[var(--yol-accent)] text-[var(--yol-accent-fg)] text-[13px] font-medium shrink-0"
              >
                Open YO →
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}