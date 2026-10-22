import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Loader2, Menu } from "lucide-react";
import { HubSidebar } from "./HubSidebar";
import { HubMobileMenu } from "./HubMobileMenu";
import { HubCommandPalette } from "./HubCommandPalette";
import type { HubPage } from "./hubNavigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface HubLayoutProps {
  children: (props: { user: User; profile: HubProfile | null }) => ReactNode;
  currentPage: HubPage;
  header: ReactNode;
}

export interface HubProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
}

export function HubLayout({ children, currentPage, header }: HubLayoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<HubProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) navigate("/hub-login");
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("user_id", user.id).single()
        .then(({ data }) => { if (data) setProfile(data as HubProfile); });
    }
  }, [user]);

  useEffect(() => {
    const check = async () => {
      if (!user?.id) return;
      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      if (data === true) { setCanAccess(true); return; }

      const { data: uc } = await supabase
        .from("user_companies").select("company_id, role")
        .eq("user_id", user.id).in("role", ["owner", "admin"]);
      if (uc && uc.length > 0) {
        const { data: parents } = await supabase
          .from("companies").select("id")
          .in("id", uc.map((u) => u.company_id)).is("parent_id", null);
        if (parents && parents.length > 0) {
          const { data: children } = await supabase
            .from("companies").select("id")
            .in("parent_id", parents.map((p) => p.id)).limit(1);
          if (children && children.length > 0) { setCanAccess(true); return; }
        }
      }
      setCanAccess(false);
    };
    if (user?.id) { setCanAccess(null); check(); }
  }, [user?.id]);

  useEffect(() => {
    if (canAccess === false) navigate("/hub-login");
  }, [canAccess, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/hub-login");
  };

  if (isLoading || canAccess === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || canAccess !== true) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {!isMobile && (
          <HubSidebar
            currentUserName={profile?.full_name || ""}
            onLogout={handleLogout}
          />
        )}

        <SidebarInset className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {isMobile ? (
                <HubMobileMenu
                  isOpen={isMobileMenuOpen}
                  onOpenChange={setIsMobileMenuOpen}
                  trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                  currentPage={currentPage}
                  userName={profile?.full_name || ""}
                  userEmail={user.email || ""}
                  userAvatar={profile?.avatar_url}
                  onLogout={handleLogout}
                />
              ) : (
                <SidebarTrigger />
              )}
              <div className="min-w-0">{header}</div>
            </div>
            <HubCommandPalette />
          </header>

          <div className="p-4 md:p-6 min-w-0 overflow-x-clip">
            {children({ user, profile })}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
