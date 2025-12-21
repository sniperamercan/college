import { motion } from "framer-motion";
import { Clock, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Event } from "@shared/schema";

interface EventCardProps {
  event: Event;
  delay?: number;
  onRegister?: (eventId: string) => void;
  onViewDetails?: (eventId: string) => void;
}

function formatEventDate(dateString: string): { day: string; month: string; weekday: string } {
  const date = new Date(dateString);
  return {
    day: date.getDate().toString().padStart(2, "0"),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

const categoryColors: Record<string, string> = {
  Academic: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Sports: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Cultural: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Workshops: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Competitions: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function EventCard({ event, delay = 0, onRegister, onViewDetails }: EventCardProps) {
  const { day, month, weekday } = formatEventDate(event.date);
  const categoryColor = event.category ? categoryColors[event.category] : "";
  const isFull = event.maxParticipants && event.currentParticipants >= event.maxParticipants;
  const isCancelled = event.cancelled;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -2 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`card-event-${event.id}`}>
        {event.imageUrl && (
          <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            {isCancelled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Badge variant="destructive" className="text-base">Cancelled</Badge>
              </div>
            )}
          </div>
        )}
        
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex gap-3">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-center">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {month}
              </span>
              <span className="text-2xl font-bold text-primary" data-testid={`text-event-day-${event.id}`}>{day}</span>
              <span className="text-xs text-muted-foreground">{weekday}</span>
            </div>
            
            <div className="min-w-0 flex-1 space-y-2">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold leading-tight line-clamp-2" data-testid={`text-event-title-${event.id}`}>
                  {event.title}
                </h3>
                {event.category && (
                  <Badge className={`text-xs ${categoryColor}`}>
                    {event.category}
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-event-description-${event.id}`}>
                {event.description}
              </p>
            </div>
          </div>

          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-secondary/50 text-secondary-foreground rounded-full px-2 py-0.5">
                  #{tag}
                </span>
              ))}
              {event.tags.length > 3 && (
                <span className="text-xs text-muted-foreground px-2 py-0.5">+{event.tags.length - 3}</span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {event.time}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
            {event.maxParticipants && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {event.currentParticipants}/{event.maxParticipants}
              </span>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            {event.requiresRegistration ? (
              <Button
                size="sm"
                onClick={() => onRegister?.(event.id)}
                disabled={isFull || isCancelled}
                className="flex-1"
                data-testid={`button-register-${event.id}`}
              >
                {isFull ? "Full" : isCancelled ? "Cancelled" : "Register"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewDetails?.(event.id)}
                className="flex-1"
                data-testid={`button-details-${event.id}`}
              >
                View Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
