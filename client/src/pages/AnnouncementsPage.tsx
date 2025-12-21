import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import type { Announcement } from "@shared/schema";

export function AnnouncementsPage() {
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Announcements</h1>
            <p className="text-sm text-muted-foreground">
              Stay updated with the latest campus news and notices
            </p>
          </div>
        </div>
      </motion.div>

      <AnnouncementList announcements={announcements} isLoading={isLoading} />
    </Layout>
  );
}
