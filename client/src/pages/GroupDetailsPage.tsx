import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ArrowLeft,
  Send,
  Search,
  UserPlus,
  UserMinus,
  Loader2,
  MessageCircle,
  Calendar,
  MessageSquare,
  FileText,
  Shield,
  Crown,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/groups/PostCard";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Group, GroupPost, User, Message } from "@shared/schema";

interface MemberWithRole extends Omit<User, "password"> {
  groupRole?: string;
}

export function GroupDetailsPage() {
  const [, params] = useRoute("/groups/:id");
  const groupId = params?.id;
  const { user, updateUser, token } = useAuth();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!groupId,
  });

  const { data: members = [] } = useQuery<MemberWithRole[]>({
    queryKey: [`/api/groups/${groupId}/members`],
    enabled: !!groupId,
  });

  const {
    data: postsData,
    fetchNextPage: fetchNextPostsPage,
    hasNextPage: hasNextPostsPage,
    isFetchingNextPage: isFetchingNextPostsPage,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useInfiniteQuery({
    queryKey: [`/api/groups/${groupId}/posts`, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      const response = await fetch(
        `/api/groups/${groupId}/posts?page=${pageParam}&limit=10${searchParam}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json() as Promise<{ posts: GroupPost[]; total: number; hasMore: boolean }>;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!groupId,
  });

  const {
    data: messagesData,
    fetchNextPage: fetchNextMessagesPage,
    hasNextPage: hasNextMessagesPage,
    isFetchingNextPage: isFetchingNextMessagesPage,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useInfiniteQuery({
    queryKey: [`/api/groups/${groupId}/messages`, messageSearchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const searchParam = messageSearchQuery ? `&search=${encodeURIComponent(messageSearchQuery)}` : "";
      const response = await fetch(
        `/api/groups/${groupId}/messages?page=${pageParam}&limit=50${searchParam}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json() as Promise<{ messages: Message[]; total: number; hasMore: boolean }>;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!groupId && !!user?.joinedGroups?.includes(groupId),
  });

  const allPosts = postsData?.pages.flatMap((page) => page.posts) ?? [];
  const allMessages = messagesData?.pages.flatMap((page) => page.messages) ?? [];
  const pinnedMessages = allMessages.filter((m) => m.isPinned);

  const isJoined = user?.joinedGroups?.includes(groupId || "");
  const isAdmin = user?.role === "admin";
  const isGroupCreator = group?.createdBy === user?.id;
  const userGroupRole = group?.memberRoles?.[user?.id || ""];

  useEffect(() => {
    if (!token || !groupId) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "message_created" && data.data.groupId === groupId) {
          refetchMessages();
        }
        if (data.type === "message_edited" && data.data.groupId === groupId) {
          refetchMessages();
        }
        if (data.type === "message_deleted" && data.data.groupId === groupId) {
          refetchMessages();
        }
        if (data.type === "message_liked" && data.data.groupId === groupId) {
          refetchMessages();
        }
        if (data.type === "message_reacted" && data.data.groupId === groupId) {
          refetchMessages();
        }
        if (data.type === "message_pinned" && data.data.groupId === groupId) {
          refetchMessages();
        }
        if (data.type === "message_unpinned" && data.data.groupId === groupId) {
          refetchMessages();
        }
        if (data.type === "typing_update" && data.data.groupId === groupId) {
          setTypingUsers(data.data.typingUsers.filter((u: { userId: string }) => u.userId !== user?.id));
        }
        if (data.type === "group_post_created" && data.data.groupId === groupId) {
          refetchPosts();
        }
        if (data.type === "group_post_deleted" && data.data.groupId === groupId) {
          refetchPosts();
        }
        if (data.type === "group_post_liked" && data.data.groupId === groupId) {
          refetchPosts();
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
    wsRef.current = ws;

    ws.addEventListener("message", handleWebSocketMessage);

    return () => {
      ws.removeEventListener("message", handleWebSocketMessage);
      ws.close();
    };
  }, [token, groupId, user?.id, refetchMessages, refetchPosts]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ user: Omit<User, "password">; group: Group }>(
        "POST",
        `/api/groups/${groupId}/join`
      );
    },
    onSuccess: (data) => {
      updateUser(data.user);
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/members`] });
      toast({ title: "Joined group", description: `You have joined ${data.group.name}` });
    },
    onError: (error) => {
      toast({
        title: "Failed to join group",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ user: Omit<User, "password">; group: Group }>(
        "POST",
        `/api/groups/${groupId}/leave`
      );
    },
    onSuccess: (data) => {
      updateUser(data.user);
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/members`] });
      toast({ title: "Left group", description: `You have left ${data.group.name}` });
    },
    onError: (error) => {
      toast({
        title: "Failed to leave group",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest<GroupPost>("POST", `/api/groups/${groupId}/posts`, { content });
    },
    onSuccess: () => {
      setPostContent("");
      refetchPosts();
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      toast({ title: "Post created", description: "Your post has been published" });
    },
    onError: (error) => {
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      setLikingPostId(postId);
      return apiRequest<GroupPost>("POST", `/api/groups/${groupId}/posts/${postId}/like`);
    },
    onSuccess: () => {
      refetchPosts();
    },
    onError: (error) => {
      toast({
        title: "Failed to like post",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setLikingPostId(null);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      setDeletingPostId(postId);
      return apiRequest<void>("DELETE", `/api/groups/${groupId}/posts/${postId}`);
    },
    onSuccess: () => {
      refetchPosts();
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      toast({ title: "Post deleted", description: "The post has been removed" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete post",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingPostId(null);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest<Message>("POST", `/api/groups/${groupId}/messages`, { content, type: "text" });
    },
    onSuccess: () => {
      refetchMessages();
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      return apiRequest<Message>("PATCH", `/api/messages/${messageId}`, { content });
    },
    onSuccess: () => {
      refetchMessages();
      toast({ title: "Message edited" });
    },
    onError: (error) => {
      toast({
        title: "Failed to edit message",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest<void>("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      refetchMessages();
      toast({ title: "Message deleted" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete message",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const likeMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest<Message>("POST", `/api/messages/${messageId}/like`);
    },
    onSuccess: () => {
      refetchMessages();
    },
    onError: (error) => {
      toast({
        title: "Failed to like message",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const reactMessageMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      return apiRequest<Message>("POST", `/api/messages/${messageId}/react`, { emoji });
    },
    onSuccess: () => {
      refetchMessages();
    },
    onError: (error) => {
      toast({
        title: "Failed to react",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      if (isPinned) {
        return apiRequest<Message>("DELETE", `/api/messages/${messageId}/pin`);
      }
      return apiRequest<Message>("POST", `/api/messages/${messageId}/pin`);
    },
    onSuccess: (_, { isPinned }) => {
      refetchMessages();
      toast({ title: isPinned ? "Message unpinned" : "Message pinned" });
    },
    onError: (error) => {
      toast({
        title: "Failed to pin message",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleTypingStart = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing_start", groupId }));
    }
  }, [groupId]);

  const handleTypingStop = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing_stop", groupId }));
    }
  }, [groupId]);

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (postContent.trim()) {
      createPostMutation.mutate(postContent.trim());
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "creator":
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case "admin":
        return <Shield className="h-3 w-3 text-blue-500" />;
      case "moderator":
        return <Star className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  if (groupLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-semibold">Group not found</h2>
          <p className="text-muted-foreground mb-4">
            The group you're looking for doesn't exist.
          </p>
          <Link href="/groups">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Groups
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Link href="/groups">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{group.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{group.category}</Badge>
                {group.department && (
                  <Badge variant="secondary">{group.department}</Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant={isJoined ? "outline" : "default"}
            onClick={() => (isJoined ? leaveMutation.mutate() : joinMutation.mutate())}
            disabled={joinMutation.isPending || leaveMutation.isPending}
          >
            {joinMutation.isPending || leaveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isJoined ? (
              <UserMinus className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isJoined ? "Leave Group" : "Join Group"}
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
                {group.messagesCount ? (
                  <Badge variant="secondary" className="ml-1">
                    {group.messagesCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="posts" className="gap-2">
                <FileText className="h-4 w-4" />
                Posts
                {group.postsCount ? (
                  <Badge variant="secondary" className="ml-1">
                    {group.postsCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-0">
              <Card className="overflow-hidden">
                <div className="h-[600px] flex flex-col">
                  {isJoined ? (
                    <>
                      <div className="border-b px-4 py-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search messages..."
                            value={messageSearchQuery}
                            onChange={(e) => setMessageSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                          />
                        </div>
                      </div>
                      <ChatFeed
                        messages={allMessages}
                        pinnedMessages={pinnedMessages}
                        isLoading={messagesLoading || isFetchingNextMessagesPage}
                        hasMore={!!hasNextMessagesPage}
                        currentUserId={user?.id || ""}
                        userRole={user?.role || "student"}
                        groupRole={userGroupRole}
                        typingUsers={typingUsers}
                        onLoadMore={() => fetchNextMessagesPage()}
                        onSendMessage={(content) => sendMessageMutation.mutate(content)}
                        onEditMessage={(messageId, content) => editMessageMutation.mutate({ messageId, content })}
                        onDeleteMessage={(messageId) => deleteMessageMutation.mutate(messageId)}
                        onLikeMessage={(messageId) => likeMessageMutation.mutate(messageId)}
                        onReactMessage={(messageId, emoji) => reactMessageMutation.mutate({ messageId, emoji })}
                        onPinMessage={(messageId, isPinned) => pinMessageMutation.mutate({ messageId, isPinned })}
                        onTypingStart={handleTypingStart}
                        onTypingStop={handleTypingStop}
                        isMember={isJoined}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-4 opacity-40" />
                      <h3 className="text-lg font-medium">Join to access chat</h3>
                      <p className="text-sm">Join the group to view and send messages</p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="posts" className="mt-0 space-y-6">
              {isJoined && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <form onSubmit={handleSubmitPost}>
                        <Textarea
                          placeholder="Share something with the group..."
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          className="min-h-[100px] resize-none mb-3"
                        />
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={!postContent.trim() || createPostMutation.isPending}
                          >
                            {createPostMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            Post
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search posts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1">
                              <Skeleton className="h-4 w-32 mb-2" />
                              <Skeleton className="h-16 w-full" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : allPosts.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <MessageCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No posts yet</h3>
                      <p className="text-muted-foreground">
                        {isJoined
                          ? "Be the first to share something with the group!"
                          : "Join the group to see and create posts."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {allPosts.map((post, index) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUserId={user?.id || ""}
                          isAdmin={isAdmin}
                          isGroupCreator={isGroupCreator}
                          onLike={(postId) => likePostMutation.mutate(postId)}
                          onDelete={(postId) => deletePostMutation.mutate(postId)}
                          isLiking={likingPostId === post.id}
                          isDeleting={deletingPostId === post.id}
                          delay={index * 0.05}
                        />
                      ))}
                    </AnimatePresence>

                    {hasNextPostsPage && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => fetchNextPostsPage()}
                          disabled={isFetchingNextPostsPage}
                        >
                          {isFetchingNextPostsPage ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Load More
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{group.description}</p>
                {group.rules && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Group Rules</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{group.rules}</p>
                    </div>
                  </>
                )}
                <Separator />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{group.memberCount}</div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{group.messagesCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Messages</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{group.postsCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Members
                  <Badge variant="secondary">{members.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members.slice(0, 8).map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(member.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{member.fullName}</p>
                            {getRoleBadge(member.groupRole)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.department}
                          </p>
                        </div>
                      </div>
                    ))}
                    {members.length > 8 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{members.length - 8} more members
                      </p>
                    )}
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
