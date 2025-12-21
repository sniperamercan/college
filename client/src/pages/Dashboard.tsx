import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Megaphone, Users, Calendar, Bell, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import { EventList } from "@/components/events/EventList";
import type { Announcement, Event, DashboardStats } from "@shared/schema";
import { useNotifications } from "@/context/NotificationContext";

export function Dashboard() {
  const { unreadCount } = useNotifications();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: recommendedEvents = [], isLoading: recommendedLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/recommended"],
  });

  const urgentAnnouncements = announcements.filter((a) => a.priority === "urgent" || a.priority === "important");
  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date()).slice(0, 3);

  return (
    <Layout>
      <WelcomeHeader />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Announcements"
          value={stats?.totalAnnouncements ?? 0}
          icon={Megaphone}
          color="blue"
          delay={0}
        />
        <StatsCard
          title="Campus Groups"
          value={stats?.totalGroups ?? 0}
          icon={Users}
          color="green"
          delay={0.1}
        />
        <StatsCard
          title="Upcoming Events"
          value={stats?.upcomingEvents ?? 0}
          icon={Calendar}
          color="purple"
          delay={0.2}
        />
        <StatsCard
          title="Notifications"
          value={unreadCount}
          icon={Bell}
          color="orange"
          delay={0.3}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Important Announcements</h2>
              </div>
              <Link href="/announcements">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-announcements">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <AnnouncementList
                announcements={urgentAnnouncements.length > 0 ? urgentAnnouncements.slice(0, 3) : announcements.slice(0, 3)}
                isLoading={announcementsLoading}
                showFilters={false}
                limit={3}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Upcoming Events</h2>
              </div>
              <Link href="/events">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-events">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <EventList
                events={upcomingEvents}
                isLoading={eventsLoading}
                limit={3}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {recommendedEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="mt-6"
        >
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Recommended for You</h2>
              </div>
              <Link href="/events">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-recommended">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <EventList
                events={recommendedEvents.slice(0, 3)}
                isLoading={recommendedLoading}
                limit={3}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        className="mt-6"
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h3 className="text-lg font-semibold">Explore Campus Groups</h3>
              <p className="text-sm text-muted-foreground">
                Join groups to connect with fellow students who share your interests
              </p>
            </div>
            <Link href="/groups">
              <Button data-testid="button-explore-groups">
                <Users className="mr-2 h-4 w-4" />
                Browse Groups
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}
