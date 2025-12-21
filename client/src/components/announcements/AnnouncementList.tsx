import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementCard } from "./AnnouncementCard";
import type { Announcement } from "@shared/schema";

interface AnnouncementListProps {
  announcements: Announcement[];
  isLoading?: boolean;
  showFilters?: boolean;
  limit?: number;
}

type FilterType = "all" | "normal" | "important" | "urgent";

export function AnnouncementList({
  announcements,
  isLoading = false,
  showFilters = true,
  limit,
}: AnnouncementListProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const filteredAnnouncements = announcements
    .filter((a) => filter === "all" || a.priority === filter)
    .filter(
      (a) =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase())
    );

  const displayAnnouncements = limit
    ? filteredAnnouncements.slice(0, limit)
    : filteredAnnouncements;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-6">
            <Skeleton className="mb-2 h-6 w-2/3" />
            <Skeleton className="mb-4 h-4 w-1/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["all", "normal", "important", "urgent"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                data-testid={`button-filter-${f}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 sm:w-64"
              data-testid="input-search-announcements"
            />
          </div>
        </div>
      )}

      {displayAnnouncements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">No announcements found</h3>
          <p className="text-sm text-muted-foreground">
            {search || filter !== "all"
              ? "Try adjusting your filters"
              : "Check back later for updates"}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {displayAnnouncements.map((announcement, index) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              delay={index * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
}
