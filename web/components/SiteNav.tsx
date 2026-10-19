import Link from "next/link";

// Add <SiteNav /> to app/layout.tsx if you do not already have a nav.
export default function SiteNav() {
  return (
    <nav className="flex gap-4 border-b border-stone-300 px-4 py-3 text-sm">
      {[["Verify", "/verify"], ["Register", "/register"], ["Buy", "/buy"], ["Sell", "/sell"], ["Dashboard", "/dashboard"]]
        .map(([label, href]) => <Link key={href} href={href} className="underline">{label}</Link>)}
    </nav>
  );
}
