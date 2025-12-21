import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Mail, Building2, CalendarDays, Users, Edit2, Save, X, Loader2, Calendar, Heart } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { departments, years } from "@shared/schema";
import type { Group, User as UserType, Event } from "@shared/schema";
import { useLocation } from "wouter";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().min(1, "Please select a department"),
  year: z.string().min(1, "Please select your year"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const { data: savedEvents = [], isLoading: savedEventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/saved"],
  });

  const joinedGroups = groups.filter((g) => user?.joinedGroups?.includes(g.id));

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      department: user?.department ?? "",
      year: user?.year ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return apiRequest<Omit<UserType, "password">>("PATCH", "/api/users/profile", data);
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateMutation.mutate(data);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account information
        </p>
      </motion.div>

      <div className="grid gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Profile Information</h2>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-profile"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                  }}
                  data-testid="button-cancel-edit"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary/10 text-2xl font-semibold">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold" data-testid="text-profile-name">{user.fullName}</h3>
                  <p className="text-muted-foreground" data-testid="text-profile-email">{user.email}</p>
                  <Badge variant="secondary" className="mt-1" data-testid="badge-role">
                    {user.role === "admin" ? "Administrator" : "Student"}
                  </Badge>
                </div>
              </div>

              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input className="pl-9" {...field} data-testid="input-edit-name" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-department">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-year">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {years.map((year) => (
                                  <SelectItem key={year} value={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium" data-testid="text-info-email">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-medium" data-testid="text-info-department">{user.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Year</p>
                      <p className="font-medium" data-testid="text-info-year">{user.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Groups Joined</p>
                      <p className="font-medium" data-testid="text-info-groups">{user.joinedGroups?.length ?? 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">My Groups</h2>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : joinedGroups.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      You haven't joined any groups yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {joinedGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                        data-testid={`profile-group-${group.id}`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.memberCount} members
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Saved Events
                </h2>
              </CardHeader>
              <CardContent>
                {savedEventsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : savedEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      You haven't saved any events yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                        data-testid={`profile-saved-event-${event.id}`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
