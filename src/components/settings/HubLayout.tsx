import { Fragment, useEffect, type ComponentType, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Layout comum de Configurações e Operações (22/10): grupos empilhados com as
// funções embaixo. No celular é uma lista que abre o item com "voltar"; no
// computador, menu à esquerda e conteúdo à direita.

export interface HubItem {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  visible: boolean;
  render: () => ReactNode;
}

export interface HubGroup {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: HubItem[];
}

export interface HubTone {
  chip: string;
  line: string;
  active: string;
}

interface Props {
  groups: HubGroup[];
  active: HubItem | null;
  onOpen: (id: string | null) => void;
  isMobile: boolean;
  backLabel: string;
  toneOf: (groupId: string) => HubTone;
}

export function HubLayout({ groups, active, onOpen, isMobile, backLabel, toneOf }: Props) {
  const activeId = active?.id;
  useEffect(() => {
    if (activeId) document.getElementById("settings-content-top")?.scrollIntoView({ block: "start" });
  }, [activeId]);

  const groupOf = (id: string) => groups.find((g) => g.items.some((i) => i.id === id));

  // Celular: lista de cartões; ao tocar, abre o item com "voltar"
  if (isMobile) {
    if (!active) {
      return (
        <div className="space-y-5 pb-6">
          {groups.map((g) => (
            <section key={g.id} className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-sm font-bold text-foreground">
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneOf(g.id).chip)}><g.icon className="h-4 w-4" /></span>
                {g.title}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
                {g.items.map((i) => (
                  <button key={i.id} type="button" onClick={() => onOpen(i.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", toneOf(g.id).chip)}><i.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{i.title}</span>
                      <span className="block text-xs text-muted-foreground truncate">{i.description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-4 pb-6">
        <div id="settings-content-top" />
        <button type="button" onClick={() => onOpen(null)} className="flex items-center gap-1 text-sm font-medium text-primary">
          <ChevronLeft className="h-4 w-4" /> {backLabel}
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{groupOf(active.id)?.title}</p>
          <h2 className="text-lg font-bold text-foreground">{active.title}</h2>
          <p className="text-xs text-muted-foreground">{active.description}</p>
        </div>
        <div className="min-w-0"><Fragment key={active.id}>{active.render()}</Fragment></div>
      </div>
    );
  }

  // Computador: menu à esquerda, conteúdo à direita
  return (
    <div className="flex gap-6 items-start">
      <nav className="w-64 shrink-0 sticky top-0 divide-y divide-border/50 rounded-2xl border border-border/40 bg-card px-3 py-1 shadow-sm">
        {groups.map((g) => {
          const tone = toneOf(g.id);
          const single = g.items.length === 1 ? g.items[0] : null;
          const header = (
            <>
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone.chip)}><g.icon className="h-4 w-4" /></span>
              <span className="truncate text-sm font-bold text-foreground">{g.title}</span>
            </>
          );
          return (
            <div key={g.id} className="py-2.5">
              {single ? (
                // Grupo com uma função só: o próprio título abre
                <button
                  type="button"
                  onClick={() => onOpen(single.id)}
                  className={cn("flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors", active?.id === single.id ? tone.active : "hover:bg-muted")}
                >
                  {header}
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 px-2 py-1.5">{header}</div>
                  <div className={cn("ml-5 mt-1 space-y-0.5 border-l-2 pl-3", tone.line)}>
                    {g.items.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => onOpen(i.id)}
                        className={cn(
                          "flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                          active?.id === i.id ? cn(tone.active, "font-semibold") : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{i.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <div id="settings-content-top" />
        {active && (
          <>
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-3">
              <div className={cn("rounded-xl p-2.5", toneOf(groupOf(active.id)?.id || "").chip)}><active.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{groupOf(active.id)?.title}</p>
                <h2 className="font-display text-lg font-bold tracking-tight">{active.title}</h2>
                <p className="text-sm text-muted-foreground">{active.description}</p>
              </div>
            </div>
            <Fragment key={active.id}>{active.render()}</Fragment>
          </>
        )}
      </div>
    </div>
  );
}
