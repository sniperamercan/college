import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "./EventCard";
import type { Event } from "@shared/schema";

interface EventListProps {
  events: Event[];
  isLoading?: boolean;
  limit?: number;
  onRegister?: (eventId: string) => void;
  onViewDetails?: (eventId: string) => void;
}

type TimeFilter = "upcoming" | "past" | "all";

export function EventList({ events, isLoading = false, limit, onRegister, onViewDetails }: EventListProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [search, setSearch] = useState("");

  const now = new Date();

  const filteredEvents = events
    .filter((e) => {
      const eventDate = new Date(e.date);
      if (timeFilter === "upcoming") return eventDate >= now;
      if (timeFilter === "past") return eventDate < now;
      return true;
    })
    .filter(
      (e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return timeFilter === "past"
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

  const displayEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 rounded-lg border p-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!limit && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {(["upcoming", "past", "all"] as const).map((filter) => (
              <Button
                key={filter}
                variant={timeFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter(filter)}
                data-testid={`button-filter-${filter}`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 sm:w-64"
              data-testid="input-search-events"
            />
          </div>
        </div>
      )}

      {displayEvents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">No events found</h3>
          <p className="text-sm text-muted-foreground">
            {timeFilter === "upcoming"
              ? "No upcoming events at the moment"
              : "Try adjusting your search"}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {displayEvents.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              delay={index * 0.05}
              onRegister={onRegister}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
