import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { EventList } from "@/components/events/EventList";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

export function EventsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: recommendedEvents = [], isLoading: recommendedLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/recommended"],
  });

  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest<Event>("POST", `/api/events/${eventId}/register`);
    },
    onSuccess: (updatedEvent) => {
      queryClient.setQueryData(["/api/events"], (oldEvents: Event[]) =>
        oldEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e)
      );
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

  const handleRegister = (eventId: string) => {
    registerMutation.mutate(eventId);
  };

  const handleViewDetails = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

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
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Events & Schedule</h1>
            <p className="text-sm text-muted-foreground">
              Don't miss out on upcoming campus activities
            </p>
          </div>
        </div>
      </motion.div>

      {recommendedEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Recommended for You</h2>
              </div>
            </CardHeader>
            <CardContent>
              <EventList
                events={recommendedEvents}
                isLoading={recommendedLoading}
                onRegister={handleRegister}
                onViewDetails={handleViewDetails}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <EventList
        events={events}
        isLoading={isLoading}
        onRegister={handleRegister}
        onViewDetails={handleViewDetails}
      />
    </Layout>
  );
}
