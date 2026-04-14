import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export interface GuiaTab {
  value: string;
  label: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

interface GuiaDialogBaseProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  tabs: GuiaTab[];
  defaultTab?: string;
}

export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border/40 bg-muted/30 p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
}

export function FeatureItem({ icon: Icon, iconColor, title, description }: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30">
      <div className={`p-1.5 rounded-lg ${iconColor} shrink-0`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export function SmartTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
      <span className="text-primary text-sm mt-0.5">💡</span>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

export function GuiaDialogBase({ title, subtitle, icon: HeaderIcon, tabs, defaultTab }: GuiaDialogBaseProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="relative overflow-hidden px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
              <HeaderIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] px-6 py-4">
          <Tabs defaultValue={defaultTab || tabs[0]?.value} className="w-full">
            <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1.5 rounded-xl bg-muted/60 border border-border/30 mb-4">
              {tabs.map(t => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="text-xs px-3 py-1.5 rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map(t => (
              <TabsContent key={t.value} value={t.value} className="space-y-4 mt-0">
                {t.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
