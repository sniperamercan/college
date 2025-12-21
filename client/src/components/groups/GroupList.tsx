import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupCard } from "./GroupCard";
import type { Group } from "@shared/schema";

interface GroupListProps {
  groups: Group[];
  joinedGroupIds: string[];
  onJoin: (groupId: string) => void;
  onLeave: (groupId: string) => void;
  updatingGroupId?: string | null;
  isLoading?: boolean;
}

type ViewType = "all" | "my-groups";

export function GroupList({
  groups,
  joinedGroupIds,
  onJoin,
  onLeave,
  updatingGroupId,
  isLoading = false,
}: GroupListProps) {
  const [view, setView] = useState<ViewType>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", ...new Set(groups.map((g) => g.category))];

  const filteredGroups = groups
    .filter((g) => {
      if (view === "my-groups") {
        return joinedGroupIds.includes(g.id);
      }
      return true;
    })
    .filter((g) => categoryFilter === "all" || g.category === categoryFilter)
    .filter(
      (g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.description.toLowerCase().includes(search.toLowerCase())
    );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border p-6">
            <Skeleton className="mb-4 h-10 w-10 rounded-lg" />
            <Skeleton className="mb-2 h-5 w-2/3" />
            <Skeleton className="mb-4 h-12 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            variant={view === "all" ? "default" : "outline"}
            onClick={() => setView("all")}
            data-testid="button-view-all-groups"
          >
            All Groups
          </Button>
          <Button
            variant={view === "my-groups" ? "default" : "outline"}
            onClick={() => setView("my-groups")}
            data-testid="button-view-my-groups"
          >
            My Groups ({joinedGroupIds.length})
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 sm:w-64"
            data-testid="input-search-groups"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={categoryFilter === category ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter(category)}
            data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {category === "all" ? "All Categories" : category}
          </Button>
        ))}
      </div>

      {filteredGroups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">No groups found</h3>
          <p className="text-sm text-muted-foreground">
            {view === "my-groups"
              ? "You haven't joined any groups yet"
              : "Try adjusting your search or filters"}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group, index) => (
            <GroupCard
              key={group.id}
              group={group}
              isJoined={joinedGroupIds.includes(group.id)}
              onJoin={onJoin}
              onLeave={onLeave}
              isUpdating={updatingGroupId === group.id}
              delay={index * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
}
