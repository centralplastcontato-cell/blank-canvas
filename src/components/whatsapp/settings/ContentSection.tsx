import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FolderOpen } from "lucide-react";
import { MessagesSection } from "./MessagesSection";
import { SalesMaterialsSection } from "./SalesMaterialsSection";

interface ContentSectionProps {
  userId: string;
  isAdmin: boolean;
}

export function ContentSection({ userId, isAdmin }: ContentSectionProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="w-full flex h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="materiais" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Materiais</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <MessagesSection userId={userId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="materiais" className="mt-4">
          <SalesMaterialsSection userId={userId} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
