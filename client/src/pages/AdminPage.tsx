import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Shield,
  Megaphone,
  Calendar,
  Users,
  Plus,
  Loader2,
  Trash2,
  BarChart3,
  Edit2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Announcement, Event, User, InsertAnnouncement, InsertEvent, Group, InsertGroup } from "@shared/schema";
import { priorities, departments } from "@shared/schema";

const announcementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["normal", "important", "urgent"]),
});

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(2, "Location is required"),
});

const userRoleSchema = z.object({
  role: z.enum(["student", "admin"]),
});

const groupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  department: z.string().optional().transform(val => val === "none" || val === "" ? undefined : val),
  rules: z.string().optional(),
});

interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalEvents: number;
  totalAnnouncements: number;
  upcomingEvents: number;
  unreadNotifications: number;
}

export function AdminPage() {
  const { toast } = useToast();
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/admin/groups"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const announcementForm = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
    },
  });

  const eventForm = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      time: "",
      location: "",
    },
  });

  const userRoleForm = useForm<z.infer<typeof userRoleSchema>>({
    resolver: zodResolver(userRoleSchema),
    defaultValues: {
      role: "student",
    },
  });

  const groupForm = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      department: "",
      rules: "",
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: InsertAnnouncement) => {
      return apiRequest<Announcement>("POST", "/api/announcements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setAnnouncementDialogOpen(false);
      announcementForm.reset();
      toast({
        title: "Announcement created",
        description: "The announcement has been published successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create announcement",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof eventSchema>) => {
      return apiRequest<Event>("POST", "/api/events", {
        ...data,
        tags: [],
        requiresRegistration: false,
        cancelled: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEventDialogOpen(false);
      eventForm.reset();
      toast({
        title: "Event created",
        description: "The event has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create event",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Announcement deleted",
        description: "The announcement has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete announcement",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Event deleted",
        description: "The event has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete event",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PUT", `/api/admin/users/${userId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUserId(null);
      toast({
        title: "User updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update user",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User deleted",
        description: "The user has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete user",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof groupSchema>) => {
      return apiRequest<Group>("POST", "/api/groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setGroupDialogOpen(false);
      groupForm.reset();
      toast({
        title: "Group created",
        description: "The group has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create group",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Group deleted",
        description: "The group has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete group",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
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
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Full control over all platform content and users
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="statistics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="statistics" className="gap-2" data-testid="tab-statistics">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2" data-testid="tab-announcements">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2" data-testid="tab-events">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2" data-testid="tab-groups">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Groups</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2" data-testid="tab-students">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Directory</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistics">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statsLoading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Total Groups</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.totalGroups || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Total Events</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.totalEvents || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Announcements</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.totalAnnouncements || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Upcoming Events</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.upcomingEvents || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Unread Notifications</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.unreadNotifications || 0}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="announcements">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Manage Announcements</h2>
              <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-announcement">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Announcement</DialogTitle>
                  </DialogHeader>
                  <Form {...announcementForm}>
                    <form
                      onSubmit={announcementForm.handleSubmit((data) =>
                        createAnnouncementMutation.mutate(data)
                      )}
                      className="space-y-4"
                    >
                      <FormField
                        control={announcementForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Announcement title" {...field} data-testid="input-announcement-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={announcementForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Announcement details..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="input-announcement-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={announcementForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-announcement-priority">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {priorities.map((priority) => (
                                  <SelectItem key={priority} value={priority}>
                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createAnnouncementMutation.isPending}
                        data-testid="button-submit-announcement"
                      >
                        {createAnnouncementMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Announcement"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : announcements.length === 0 ? (
                <div className="py-12 text-center">
                  <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No announcements yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="flex items-start justify-between gap-4 rounded-lg border p-4"
                      data-testid={`admin-announcement-${announcement.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h4 className="font-medium">{announcement.title}</h4>
                          <Badge
                            variant={
                              announcement.priority === "urgent"
                                ? "destructive"
                                : announcement.priority === "important"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {announcement.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {announcement.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                        disabled={deleteAnnouncementMutation.isPending}
                        data-testid={`button-delete-announcement-${announcement.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Manage Events</h2>
              <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-event">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                  </DialogHeader>
                  <Form {...eventForm}>
                    <form
                      onSubmit={eventForm.handleSubmit((data) =>
                        createEventMutation.mutate(data)
                      )}
                      className="space-y-4"
                    >
                      <FormField
                        control={eventForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Event title" {...field} data-testid="input-event-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={eventForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Event details..."
                                className="min-h-[80px]"
                                {...field}
                                data-testid="input-event-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={eventForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-event-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eventForm.control}
                          name="time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-event-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={eventForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Event location" {...field} data-testid="input-event-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createEventMutation.isPending}
                        data-testid="button-submit-event"
                      >
                        {createEventMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Event"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No events yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-4 rounded-lg border p-4"
                      data-testid={`admin-event-${event.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="mb-1 font-medium">{event.title}</h4>
                        <p className="mb-2 text-sm text-muted-foreground line-clamp-1">
                          {event.description}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                          <span>{event.time}</span>
                          <span>{event.location}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                        disabled={deleteEventMutation.isPending}
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Manage Users</h2>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : students.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No users registered yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id} data-testid={`student-row-${student.id}`}>
                          <TableCell className="font-medium">{student.fullName}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.department}</TableCell>
                          <TableCell>{student.year}</TableCell>
                          <TableCell>
                            {editingUserId === student.id ? (
                              <Dialog open={editingUserId === student.id} onOpenChange={(open) => !open && setEditingUserId(null)}>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Change User Role</DialogTitle>
                                  </DialogHeader>
                                  <Form {...userRoleForm}>
                                    <form
                                      onSubmit={userRoleForm.handleSubmit((data) =>
                                        updateUserRoleMutation.mutate({ userId: student.id, role: data.role })
                                      )}
                                      className="space-y-4"
                                    >
                                      <FormField
                                        control={userRoleForm.control}
                                        name="role"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={student.role}>
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                <SelectItem value="student">Student</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={updateUserRoleMutation.isPending}
                                      >
                                        {updateUserRoleMutation.isPending ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                          </>
                                        ) : (
                                          "Update Role"
                                        )}
                                      </Button>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <Badge variant={student.role === "admin" ? "default" : "secondary"}>
                                {student.role}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUserId(student.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUserMutation.mutate(student.id)}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Manage Groups</h2>
              <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-group">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                  </DialogHeader>
                  <Form {...groupForm}>
                    <form
                      onSubmit={groupForm.handleSubmit((data) =>
                        createGroupMutation.mutate(data)
                      )}
                      className="space-y-4"
                    >
                      <FormField
                        control={groupForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Programming Club" {...field} data-testid="input-group-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={groupForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the group's purpose and activities..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="input-group-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={groupForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Technology, Sports, Arts" {...field} data-testid="input-group-category" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={groupForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-group-department">
                                  <SelectValue placeholder="Select a department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No Department</SelectItem>
                                {departments.map((dept) => (
                                  <SelectItem key={dept} value={dept}>
                                    {dept}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={groupForm.control}
                        name="rules"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group Rules (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="List group rules separated by newlines..."
                                className="min-h-[80px]"
                                {...field}
                                data-testid="input-group-rules"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createGroupMutation.isPending}
                        data-testid="button-submit-group"
                      >
                        {createGroupMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Group"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No groups yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-start justify-between gap-4 rounded-lg border p-4"
                      data-testid={`admin-group-${group.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="mb-1 font-medium">{group.name}</h4>
                        <p className="mb-2 text-sm text-muted-foreground line-clamp-1">
                          {group.description}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{group.category}</Badge>
                          <span>{group.department}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteGroupMutation.mutate(group.id)}
                        disabled={deleteGroupMutation.isPending}
                        data-testid={`button-delete-group-${group.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Student Directory</h2>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : students.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No students registered yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id} data-testid={`student-row-${student.id}`}>
                          <TableCell className="font-medium">{student.fullName}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.department}</TableCell>
                          <TableCell>{student.year}</TableCell>
                          <TableCell>
                            <Badge variant={student.role === "admin" ? "default" : "secondary"}>
                              {student.role}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
