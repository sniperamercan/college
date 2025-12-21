import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users, Heart, Download, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

const categoryColors: Record<string, string> = {
  Academic: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Sports: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Cultural: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Workshops: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Competitions: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${id}`],
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<Event>("POST", `/api/events/${id}/register`);
    },
    onSuccess: (updatedEvent) => {
      queryClient.setQueryData([`/api/events/${id}`], updatedEvent);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Registered successfully",
        description: `You've registered for ${updatedEvent.title}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ message: string }>("POST", `/api/events/${id}/save`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/saved"] });
      toast({
        title: "Event saved",
        description: "This event has been added to your saved events",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const downloadICS = () => {
    if (!event) return;

    const startDate = new Date(event.date);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[:\-]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CampusHub//Event Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@campushub.local
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(icsContent));
    element.setAttribute("download", `${event.title.replace(/\s+/g, "-").toLowerCase()}.ics`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Calendar file downloaded",
      description: "You can import this into Google Calendar or Outlook",
    });
  };

  const calculateCountdown = () => {
    if (!event) return null;
    const eventDate = new Date(event.date);
    const now = new Date();
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Event has passed";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `Starts in ${diffDays} days`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Event not found</h2>
          <Button onClick={() => navigate("/events")}>Back to Events</Button>
        </div>
      </Layout>
    );
  }

  const categoryColor = event.category ? categoryColors[event.category] : "";
  const isFull = event.maxParticipants && event.currentParticipants >= event.maxParticipants;
  const isCancelled = event.cancelled;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/events")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>

        {event.imageUrl && (
          <div className="relative h-96 w-full rounded-lg overflow-hidden mb-6 bg-gradient-to-br from-primary/20 to-primary/10">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            {isCancelled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Badge variant="destructive" className="text-xl px-4 py-2">Cancelled</Badge>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold">{event.title}</h1>
                  <div className="flex flex-wrap gap-2 items-center">
                    {event.category && (
                      <Badge className={`text-sm ${categoryColor}`}>
                        {event.category}
                      </Badge>
                    )}
                    <span className="text-sm font-medium text-primary">
                      {calculateCountdown()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Date</p>
                      <p className="font-medium">{new Date(event.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Time</p>
                      <p className="font-medium">{event.time}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Location</p>
                      <p className="font-medium">{event.location}</p>
                    </div>
                  </div>

                  {event.maxParticipants && (
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Participants</p>
                        <p className="font-medium">{event.currentParticipants}/{event.maxParticipants}</p>
                      </div>
                    </div>
                  )}
                </div>

                {event.tags && event.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center bg-secondary/50 text-secondary-foreground text-xs rounded-full px-3 py-1">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4">
                  {event.requiresRegistration ? (
                    <Button
                      onClick={() => registerMutation.mutate()}
                      disabled={isFull || isCancelled || registerMutation.isPending}
                      size="lg"
                      className="flex-1"
                    >
                      {isFull ? "Event is Full" : isCancelled ? "Event Cancelled" : registerMutation.isPending ? "Registering..." : "Register Now"}
                    </Button>
                  ) : (
                    <Button size="lg" className="flex-1" disabled>
                      No registration required
                    </Button>
                  )}
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    variant="outline"
                    size="lg"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={downloadICS}
                    variant="outline"
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Event Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Category</p>
                  <p className="font-medium">{event.category || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Registration</p>
                  <p className="font-medium">{event.requiresRegistration ? "Required" : "Not required"}</p>
                </div>
                {event.maxParticipants && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Capacity</p>
                    <p className="font-medium">{event.currentParticipants}/{event.maxParticipants} registered</p>
                    {!isFull && (
                      <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(event.currentParticipants / event.maxParticipants) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Status</p>
                  <Badge variant={isCancelled ? "destructive" : "default"}>
                    {isCancelled ? "Cancelled" : isFull ? "Full" : "Available"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}
