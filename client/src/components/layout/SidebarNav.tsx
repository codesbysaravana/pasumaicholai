import { NavLink } from "react-router-dom";
import logo from "../../assets/img/logi.png";

export interface SidebarItem {
  label: string;
  href: string;
}

interface SidebarNavProps {
  items: SidebarItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  return (
    <aside className="role-sidebar">
      <div className="sidebar-brand-box mb-12 px-2 flex flex-col items-center gap-6 w-full text-center">
        <img src={logo} alt="Logo" className="h-20 w-auto filter drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
        <div className="sidebar-brand-text font-serif italic text-3xl tracking-tight leading-none font-black whitespace-nowrap">
          <span className="text-accent-green">Pasumai</span> <span className="text-[#f59e0b] ml-4">Cholai</span>
        </div>
      </div>
      <div className="sidebar-nav-list grid gap-1">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.label === "Overview"}
            className="role-nav-item"
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
