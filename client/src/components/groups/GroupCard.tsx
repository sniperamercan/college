import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, Check, Plus, Loader2, MessageCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Group } from "@shared/schema";

interface GroupCardProps {
  group: Group;
  isJoined: boolean;
  onJoin: (groupId: string) => void;
  onLeave: (groupId: string) => void;
  isUpdating?: boolean;
  delay?: number;
}

export function GroupCard({
  group,
  isJoined,
  onJoin,
  onLeave,
  isUpdating = false,
  delay = 0,
}: GroupCardProps) {
  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isJoined) {
      onLeave(group.id);
    } else {
      onJoin(group.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Link href={`/groups/${group.id}`}>
        <Card className="h-full overflow-visible hover-elevate transition-shadow cursor-pointer group" data-testid={`card-group-${group.id}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                {group.department && (
                  <Badge variant="secondary" className="text-xs">
                    {group.department}
                  </Badge>
                )}
                <Badge variant="outline" data-testid={`badge-category-${group.id}`}>
                  {group.category}
                </Badge>
              </div>
            </div>
            <h3 className="mt-3 text-lg font-semibold leading-tight group-hover:text-primary transition-colors" data-testid={`text-group-name-${group.id}`}>
              {group.name}
            </h3>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-group-description-${group.id}`}>
              {group.description}
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span data-testid={`text-member-count-${group.id}`}>{group.memberCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  <span>{group.postsCount || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={isJoined ? "outline" : "default"}
                  size="sm"
                  onClick={handleJoinClick}
                  disabled={isUpdating}
                  data-testid={`button-${isJoined ? "leave" : "join"}-${group.id}`}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isJoined ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Joined
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 h-4 w-4" />
                      Join
                    </>
                  )}
                </Button>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
