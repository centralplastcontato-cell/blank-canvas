import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, FileText, Image, Video, Loader2, Sparkles, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface SalesMaterial {
  id: string;
  unit: string;
  type: "pdf_package" | "photo" | "video" | "photo_collection";
  name: string;
  guest_count: number | null;
  file_url: string;
  photo_urls: string[] | null;
  is_active: boolean;
  send_without_caption?: boolean;
}

interface Caption {
  id: string;
  caption_type: "video" | "video_promo" | "photo_collection";
  caption_text: string;
}

interface Lead {
  id: string;
  name: string;
  guests?: string | null;
  unit?: string | null;
  month?: string | null;
  day_of_month?: number | null;
}

interface SalesMaterialsMenuProps {
  unit: string;
  lead?: Lead | null;
  onSendMedia: (url: string, type: "document" | "image" | "video", caption?: string, fileName?: string) => Promise<void>;
  onSendTextMessage?: (message: string) => Promise<void>;
  disabled?: boolean;
  variant?: "icon" | "full";
}

type CategoryType = "main" | "pdf_package" | "photo" | "video" | "photo_collection";

function isImageUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
}

export function SalesMaterialsMenu({ 
  unit, 
  lead, 
  onSendMedia,
  onSendTextMessage,
  disabled = false,
  variant = "icon"
}: SalesMaterialsMenuProps) {
  const [materials, setMaterials] = useState<SalesMaterial[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>("main");
  const [companyName, setCompanyName] = useState<string>('');
  const isMobile = useIsMobile();

  // Fetch company name to use in client-facing messages instead of internal unit name
  useEffect(() => {
    const fetchCompanyName = async () => {
      const storedCompanyId = localStorage.getItem('selected_company_id');
      if (!storedCompanyId) return;
      const { data } = await supabase
        .from('companies')
        .select('name')
        .eq('id', storedCompanyId)
        .single();
      if (data?.name) setCompanyName(data.name);
    };
    fetchCompanyName();
  }, []);

  // The display name for client-facing messages (company name or fallback to unit)
  const publicName = companyName || unit;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch materials and captions in parallel
      const [materialsResponse, captionsResponse] = await Promise.all([
        supabase
          .from("sales_materials")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("sales_material_captions")
          .select("*")
          .eq("is_active", true)
      ]);

      if (materialsResponse.error) {
        console.error("[SalesMaterialsMenu] Error fetching materials:", materialsResponse.error);
      } else if (materialsResponse.data) {
        console.log("[SalesMaterialsMenu] Fetched materials for unit:", unit, "Count:", materialsResponse.data.length);
        setMaterials(materialsResponse.data as SalesMaterial[]);
      }

      if (captionsResponse.error) {
        console.error("[SalesMaterialsMenu] Error fetching captions:", captionsResponse.error);
      } else if (captionsResponse.data) {
        // Filter valid caption types
        const validTypes = ["video", "video_promo", "photo_collection"];
        const validCaptions = captionsResponse.data.filter(c => validTypes.includes(c.caption_type)) as Caption[];
        setCaptions(validCaptions);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (unit) {
      fetchData();
    }
  }, [unit]);

  // Reset category when closing
  useEffect(() => {
    if (!isOpen) {
      setActiveCategory("main");
    }
  }, [isOpen]);

  const getLeadGuestCount = (): number | null => {
    if (!lead?.guests) return null;
    const match = lead.guests.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  };

  const leadGuestCount = getLeadGuestCount();

  // Helper function to get caption from database and replace {unidade} variable
  const getCaption = (captionType: "video" | "video_promo" | "photo_collection"): string => {
    const caption = captions.find(c => c.caption_type === captionType);
    if (caption) {
      return caption.caption_text.replace(/\{unidade\}/gi, publicName);
    }
    
    // Fallback defaults if not found in database
    const defaults: Record<string, string> = {
      video: `🎬 Veja como é incrível o nosso espaço! ✨ ${publicName} te espera para uma festa inesquecível! 🎉`,
      video_promo: "🎭🎉 PROMOÇÃO ESPECIAL DE CARNAVAL! 🎊✨ Aproveite condições imperdíveis para garantir a festa dos sonhos do seu filho! Entre em contato agora e confira! 🏰💜",
      photo_collection: `✨ Espaço incrível para festas inesquecíveis! Venha conhecer o ${publicName} e encante-se com a estrutura completa para a diversão da criançada! 🎉🏰`
    };
    
    return defaults[captionType] || defaults.video;
  };

  // Use useMemo to ensure filters are recalculated when materials change
  const { packages, photos, videos, collections } = useMemo(() => ({
    packages: materials.filter(m => m.type === "pdf_package"),
    photos: materials.filter(m => m.type === "photo"),
    videos: materials.filter(m => m.type === "video"),
    collections: materials.filter(m => m.type === "photo_collection"),
  }), [materials]);

  const sortedPackages = useMemo(() => {
    return [...packages].sort((a, b) => {
      if (leadGuestCount) {
        const aMatch = a.guest_count === leadGuestCount;
        const bMatch = b.guest_count === leadGuestCount;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      return (a.guest_count || 0) - (b.guest_count || 0);
    });
  }, [packages, leadGuestCount]);

  const handleSendMaterial = async (material: SalesMaterial) => {
    setIsSending(material.id);
    try {
      // Handle photo collection - send caption once, then photos without captions
      if (material.type === "photo_collection" && material.photo_urls && material.photo_urls.length > 0) {
        const photoCount = material.photo_urls.length;
        
        // Send caption message once before photos
        if (onSendTextMessage) {
          const unitCaption = getCaption("photo_collection");
          await onSendTextMessage(unitCaption);
          // Small delay to ensure message order
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Send photos sequentially with delay to avoid API rate limits
        for (let i = 0; i < material.photo_urls.length; i++) {
          try {
            await onSendMedia(material.photo_urls[i], "image");
          } catch (err) {
            console.error(`[SalesMaterialsMenu] Erro na foto ${i+1}:`, err);
          }
          if (i < material.photo_urls.length - 1) {
            const delay = material.photo_urls.length > 5 ? 3000 : 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        toast({
          title: "Coleção enviada",
          description: `${photoCount} fotos de "${material.name}" enviadas com sucesso.`,
        });
        
        setIsOpen(false);
        setIsSending(null);
        return;
      }

      // Detect if pdf_package file is actually an image
      const isPackageImage = material.type === "pdf_package" && isImageUrl(material.file_url);
      let mediaType: "document" | "image" | "video" = isPackageImage ? "image" : "document";
      const safeMaterialName = material.name?.trim() || "material";
      let caption = material.send_without_caption ? "" : (material.name?.trim() || "");
      let fileName: string | undefined = undefined;

      if (material.type === "photo" || isPackageImage) {
        mediaType = "image";
      } else if (material.type === "video") {
        mediaType = "video";
        if (!material.send_without_caption) {
          const isCarnavalVideo = safeMaterialName.toLowerCase().includes("carnaval") || 
                                  safeMaterialName.toLowerCase().includes("promoção") ||
                                  safeMaterialName.toLowerCase().includes("promocao");
          
          if (isCarnavalVideo) {
            caption = getCaption("video_promo");
          } else {
            caption = getCaption("video");
          }
        }
      } else if (material.type === "pdf_package" && !isPackageImage) {
        fileName = `${safeMaterialName.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'material'}.pdf`;
        if (!material.send_without_caption && material.guest_count && material.name?.trim()) {
          caption = `📋 ${material.name.trim()} - Pacote para ${material.guest_count} pessoas`;
        }
        
        if (!material.send_without_caption && onSendTextMessage && material.guest_count) {
          const leadName = lead?.name?.split(' ')[0] || '';
          const guestCount = material.guest_count;
          
          let introMessage = '';
          if (leadName) {
             introMessage = `Oi ${leadName}! Segue o pacote para ${guestCount} convidados do ${publicName}. Qualquer dúvida, estou à disposição! 🎉`;
           } else {
             introMessage = `Segue o pacote para ${guestCount} convidados do ${publicName}. Qualquer dúvida, estou à disposição! 🎉`;
           }
          
          await onSendTextMessage(introMessage);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      await onSendMedia(material.file_url, mediaType, caption || undefined, fileName);
      
      toast({
        title: "Material enviado",
        description: `${safeMaterialName} foi enviado com sucesso.`,
      });
      
      setIsOpen(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Não foi possível enviar o material.",
        variant: "destructive",
      });
    }
    setIsSending(null);
  };

  const hasMaterials = materials.length > 0;

  if (!hasMaterials && !isLoading) {
    return null;
  }

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size={variant === "icon" ? "icon" : "sm"}
      disabled={disabled || isLoading}
      className={variant === "icon" ? "shrink-0 h-9 w-9" : "shrink-0"}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <FolderOpen className="w-4 h-4" />
          {variant === "full" && <span className="ml-2">Materiais</span>}
        </>
      )}
    </Button>
  );

  // Mobile: Use Sheet with internal navigation
  if (isMobile) {
    const getCategoryTitle = () => {
      switch (activeCategory) {
        case "pdf_package": return "Pacotes";
        case "photo_collection": return "Coleções";
        case "photo": return "Fotos";
        case "video": return "Vídeos";
        default: return `Materiais - ${unit}`;
      }
    };

    const getCurrentItems = () => {
      switch (activeCategory) {
        case "pdf_package": return sortedPackages;
        case "photo_collection": return collections;
        case "photo": return photos;
        case "video": return videos;
        default: return [];
      }
    };

    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              {activeCategory !== "main" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-2"
                  onClick={() => setActiveCategory("main")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <FolderOpen className="w-4 h-4" />
              {getCategoryTitle()}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(60vh-80px)]">
            {activeCategory === "main" ? (
              // Main category list
              <div className="space-y-1 py-2">
                {sortedPackages.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12 px-3"
                    onClick={() => setActiveCategory("pdf_package")}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-red-500" />
                      <span>Pacotes</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">{sortedPackages.length}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}
                
                {collections.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12 px-3"
                    onClick={() => setActiveCategory("photo_collection")}
                  >
                    <div className="flex items-center gap-3">
                      <Images className="w-5 h-5 text-green-500" />
                      <span>Coleções</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">{collections.length}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}

                {photos.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12 px-3"
                    onClick={() => setActiveCategory("photo")}
                  >
                    <div className="flex items-center gap-3">
                      <Image className="w-5 h-5 text-blue-500" />
                      <span>Fotos</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">{photos.length}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}
                
                {videos.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12 px-3"
                    onClick={() => setActiveCategory("video")}
                  >
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-purple-500" />
                      <span>Vídeos</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">{videos.length}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}
              </div>
            ) : (
              // Items list for selected category
              <div className="space-y-1 py-2">
                {getCurrentItems().map((material) => {
                  const isSuggested = leadGuestCount && material.guest_count === leadGuestCount;
                  return (
                    <Button
                      key={material.id}
                      variant="ghost"
                      className={`w-full justify-start h-auto py-3 px-3 ${isSuggested ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                      disabled={isSending === material.id}
                      onClick={() => handleSendMaterial(material)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {isSending === material.id ? (
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        ) : (
                          <>
                            {material.type === "pdf_package" && <FileText className="w-5 h-5 text-red-500 shrink-0" />}
                            {material.type === "photo_collection" && <Images className="w-5 h-5 text-green-500 shrink-0" />}
                            {material.type === "photo" && <Image className="w-5 h-5 text-blue-500 shrink-0" />}
                            {material.type === "video" && <Video className="w-5 h-5 text-purple-500 shrink-0" />}
                          </>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="truncate text-sm font-medium">{material.name}</p>
                          {material.type === "photo_collection" && material.photo_urls && (
                            <p className="text-xs text-muted-foreground">
                              {material.photo_urls.length} fotos
                            </p>
                          )}
                          {material.guest_count && (
                            <p className="text-xs text-muted-foreground">
                              {material.guest_count} pessoas
                            </p>
                          )}
                        </div>
                        {isSuggested && (
                          <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use DropdownMenu with submenus
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Materiais de Vendas - {unit}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {sortedPackages.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileText className="w-4 h-4 mr-2 text-red-500" />
              Pacotes ({sortedPackages.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {sortedPackages.map((material) => {
                const isSuggested = leadGuestCount && material.guest_count === leadGuestCount;
                return (
                  <DropdownMenuItem
                    key={material.id}
                    onClick={() => handleSendMaterial(material)}
                    disabled={isSending === material.id}
                    className={isSuggested ? "bg-primary/10 border-l-2 border-primary" : ""}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {isSending === material.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm">{material.name}</p>
                        {material.guest_count && (
                          <p className="text-xs text-muted-foreground">
                            {material.guest_count} pessoas
                          </p>
                        )}
                      </div>
                      {isSuggested && (
                        <Sparkles className="w-3 h-3 text-primary shrink-0" />
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {collections.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Images className="w-4 h-4 mr-2 text-green-500" />
              Coleções ({collections.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {collections.map((material) => (
                <DropdownMenuItem
                  key={material.id}
                  onClick={() => handleSendMaterial(material)}
                  disabled={isSending === material.id}
                >
                  <div className="flex items-center gap-2 w-full">
                    {isSending === material.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Images className="w-4 h-4 text-green-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{material.name}</p>
                      {material.photo_urls && (
                        <p className="text-xs text-muted-foreground">
                          {material.photo_urls.length} fotos
                        </p>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {photos.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Image className="w-4 h-4 mr-2 text-blue-500" />
              Fotos ({photos.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {photos.map((material) => (
                <DropdownMenuItem
                  key={material.id}
                  onClick={() => handleSendMaterial(material)}
                  disabled={isSending === material.id}
                >
                  {isSending === material.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Image className="w-4 h-4 mr-2 text-blue-500" />
                  )}
                  <span className="truncate">{material.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {videos.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Video className="w-4 h-4 mr-2 text-purple-500" />
              Vídeos ({videos.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {videos.map((material) => (
                <DropdownMenuItem
                  key={material.id}
                  onClick={() => handleSendMaterial(material)}
                  disabled={isSending === material.id}
                >
                  {isSending === material.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4 mr-2 text-purple-500" />
                  )}
                  <span className="truncate">{material.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {!hasMaterials && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nenhum material configurado para {unit}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
