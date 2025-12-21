import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Heart, MoreHorizontal, Pencil, Trash2, Pin, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Message } from "@shared/schema";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onLike: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onPin: (messageId: string, isPinned: boolean) => void;
  currentUserId: string;
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

export function MessageBubble({
  message,
  isOwn,
  canEdit,
  canDelete,
  canPin,
  onEdit,
  onDelete,
  onLike,
  onReact,
  onPin,
  currentUserId,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "h:mm a");
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    if (e.key === "Escape") {
      setEditContent(message.content);
      setIsEditing(false);
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

  const hasLiked = message.likedBy.includes(currentUserId);

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-2 hover:bg-muted/50 transition-colors",
        message.isPinned && "bg-yellow-50 dark:bg-yellow-900/10 border-l-2 border-yellow-500"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarImage src={message.authorAvatar} alt={message.authorName} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(message.authorName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-semibold text-sm", isOwn && "text-primary")}>
            {message.authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {message.isPinned && (
            <Pin className="h-3 w-3 text-yellow-600" />
          )}
        </div>

        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant="outline" onClick={() => {
                setEditContent(message.content);
                setIsEditing(false);
              }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleEditSubmit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                  users.includes(currentUserId)
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted border-transparent hover:border-primary/30"
                )}
              >
                <span>{emoji}</span>
                <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {message.likes > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Heart className={cn("h-3 w-3", hasLiked && "fill-red-500 text-red-500")} />
            <span>{message.likes}</span>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex items-start gap-1 transition-opacity",
          showActions ? "opacity-100" : "opacity-0"
        )}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="flex gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onLike(message.id)}
        >
          <Heart className={cn("h-4 w-4", hasLiked && "fill-red-500 text-red-500")} />
        </Button>

        {(canEdit || canDelete || canPin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {canPin && (
                <DropdownMenuItem onClick={() => onPin(message.id, message.isPinned)}>
                  <Pin className="h-4 w-4 mr-2" />
                  {message.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(message.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
