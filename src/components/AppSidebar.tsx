import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Newspaper,
  Search,
  FolderOpen,
  Bookmark,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";
import { authClient } from "~/lib/auth-client";
import { useState } from "react";
import { Tooltip } from "./ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Topics", href: "/topics", icon: Newspaper },
  { title: "Search", href: "/search", icon: Search },
  { title: "Collections", href: "/collections", icon: FolderOpen },
  { title: "Saved Searches", href: "/saved-searches", icon: Bookmark },
  { title: "Teams", href: "/teams", icon: Users },
];

const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  const NavLink = ({ item, collapsed }: { item: NavItem; collapsed: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    const linkContent = (
      <Link
        to={item.href as "/dashboard" | "/topics" | "/search" | "/collections" | "/saved-searches" | "/teams" | "/settings"}
        className={cn(
          "flex items-center h-10 rounded-md transition-colors",
          collapsed ? "justify-center w-full" : "gap-3 px-3",
          active
            ? "bg-sidebar-accent text-sidebar-primary font-medium"
            : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.title}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <div className="w-full">
          <Tooltip content={item.title}>
            {linkContent}
          </Tooltip>
        </div>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Logo Header */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          {collapsed ? (
            <img src="/pams-logo.png" alt="PAMS" className="h-8 w-8 object-contain" />
          ) : (
            <img src="/pams-logo.png" alt="PAMS NewsMonitor" className="h-8 object-contain" />
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-2 py-4 border-t border-sidebar-border space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}

        {/* Sign Out Button */}
        {collapsed ? (
          <Tooltip content="Sign Out">
            <button
              onClick={() => authClient.signOut()}
              className="flex items-center justify-center h-10 w-full rounded-md transition-colors text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => authClient.signOut()}
            className="flex items-center gap-3 h-10 px-3 w-full rounded-md transition-colors text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="px-2 py-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "px-0" : "px-3"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
