import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { GroupList } from "@/components/groups/GroupList";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Group, User } from "@shared/schema";

export function GroupsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const joinMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest<{ user: Omit<User, "password">; group: Group }>("POST", `/api/groups/${groupId}/join`);
    },
    onMutate: (groupId) => {
      setUpdatingGroupId(groupId);
    },
    onSuccess: (data) => {
      updateUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Joined group",
        description: `You have joined ${data.group.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to join group",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingGroupId(null);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest<{ user: Omit<User, "password">; group: Group }>("POST", `/api/groups/${groupId}/leave`);
    },
    onMutate: (groupId) => {
      setUpdatingGroupId(groupId);
    },
    onSuccess: (data) => {
      updateUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Left group",
        description: `You have left ${data.group.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to leave group",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingGroupId(null);
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
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Campus Groups</h1>
            <p className="text-sm text-muted-foreground">
              Discover and join groups that match your interests
            </p>
          </div>
        </div>
      </motion.div>

      <GroupList
        groups={groups}
        joinedGroupIds={user?.joinedGroups ?? []}
        onJoin={(groupId) => joinMutation.mutate(groupId)}
        onLeave={(groupId) => leaveMutation.mutate(groupId)}
        updatingGroupId={updatingGroupId}
        isLoading={isLoading}
      />
    </Layout>
  );
}
