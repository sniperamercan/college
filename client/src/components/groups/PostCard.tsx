import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Heart, Trash2, User, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { GroupPost } from "@shared/schema";

interface PostCardProps {
  post: GroupPost;
  currentUserId: string;
  isAdmin?: boolean;
  isGroupCreator?: boolean;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  isLiking?: boolean;
  isDeleting?: boolean;
  delay?: number;
}

export function PostCard({
  post,
  currentUserId,
  isAdmin = false,
  isGroupCreator = false,
  onLike,
  onDelete,
  isLiking = false,
  isDeleting = false,
  delay = 0,
}: PostCardProps) {
  const isLiked = post.likedBy?.includes(currentUserId);
  const canDelete = isAdmin || isGroupCreator || post.authorId === currentUserId;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(post.authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-sm">{post.authorName}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(post.id)}
                    disabled={isDeleting}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{post.content}</p>
              <div className="mt-3 flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLike(post.id)}
                  disabled={isLiking}
                  className={`h-8 px-2 ${isLiked ? "text-red-500" : "text-muted-foreground"}`}
                >
                  {isLiking ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
                  )}
                  <span className="text-xs">{post.likes || 0}</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
