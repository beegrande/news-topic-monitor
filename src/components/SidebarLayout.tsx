import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent } from "./ui/sheet";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import { NotificationDropdown } from "./NotificationDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useUserAvatar } from "~/hooks/useUserAvatar";
import { authClient } from "~/lib/auth-client";

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { avatarUrl } = useUserAvatar();
  const { data: session } = authClient.useSession();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar">
          <AppSidebar className="border-r-0" />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>

            {/* Mobile Logo */}
            <Link to="/" className="flex items-center gap-2 md:hidden">
              <img src="/pams-logo.png" alt="PAMS" className="h-6 object-contain" />
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <ModeToggle />
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-sm">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
