import { motion } from "framer-motion";
import { Clock, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Announcement } from "@shared/schema";

interface AnnouncementCardProps {
  announcement: Announcement;
  delay?: number;
}

const priorityConfig = {
  normal: {
    icon: Info,
    variant: "secondary" as const,
    label: "Normal",
    borderClass: "border-l-4 border-l-muted-foreground/30",
  },
  important: {
    icon: AlertCircle,
    variant: "default" as const,
    label: "Important",
    borderClass: "border-l-4 border-l-blue-500",
  },
  urgent: {
    icon: AlertTriangle,
    variant: "destructive" as const,
    label: "Urgent",
    borderClass: "border-l-4 border-l-destructive",
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AnnouncementCard({ announcement, delay = 0 }: AnnouncementCardProps) {
  const config = priorityConfig[announcement.priority];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card
        className={`overflow-visible hover-elevate transition-shadow ${config.borderClass}`}
        data-testid={`card-announcement-${announcement.id}`}
      >
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-tight" data-testid={`text-announcement-title-${announcement.id}`}>
              {announcement.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span data-testid={`text-announcement-author-${announcement.id}`}>By {announcement.authorName}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(announcement.createdAt)}
              </span>
            </div>
          </div>
          <Badge variant={config.variant} className="shrink-0 gap-1" data-testid={`badge-priority-${announcement.id}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-announcement-description-${announcement.id}`}>
            {announcement.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
