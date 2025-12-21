import { useEffect, useRef, useState, useCallback } from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Loader2, ArrowDown, Pin } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Message } from "@shared/schema";

interface ChatFeedProps {
  messages: Message[];
  pinnedMessages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  currentUserId: string;
  userRole: string;
  groupRole?: string;
  typingUsers: { userId: string; userName: string }[];
  onLoadMore: () => void;
  onSendMessage: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onLikeMessage: (messageId: string) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onPinMessage: (messageId: string, isPinned: boolean) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  isMember: boolean;
}

export function ChatFeed({
  messages,
  pinnedMessages,
  isLoading,
  hasMore,
  currentUserId,
  userRole,
  groupRole,
  typingUsers,
  onLoadMore,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onLikeMessage,
  onReactMessage,
  onPinMessage,
  onTypingStart,
  onTypingStop,
  isMember,
}: ChatFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsAtBottom(distanceFromBottom < 100);
    setShowScrollButton(distanceFromBottom > 300);

    if (scrollTop < 100 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && isAtBottom) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0 && prevMessagesLengthRef.current === 0) {
      scrollToBottom("instant");
    }
  }, [messages.length, scrollToBottom]);

  const canEdit = (message: Message) => {
    return message.authorId === currentUserId;
  };

  const canDelete = (message: Message) => {
    if (message.authorId === currentUserId) return true;
    if (userRole === "admin") return true;
    if (groupRole === "creator" || groupRole === "admin" || groupRole === "moderator") return true;
    return false;
  };

  const canPin = () => {
    if (userRole === "admin") return true;
    if (groupRole === "creator" || groupRole === "admin") return true;
    return false;
  };

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt).toDateString();
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    
    if (lastGroup && lastGroup.date === messageDate) {
      lastGroup.messages.push(message);
    } else {
      groupedMessages.push({ date: messageDate, messages: [message] });
    }
  });

  return (
    <div className="flex flex-col h-full">
      {pinnedMessages.length > 0 && (
        <div className="border-b bg-yellow-50 dark:bg-yellow-900/10 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Pin className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-yellow-700 dark:text-yellow-500">
              {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative"
        onScroll={handleScroll}
      >
        {isLoading && hasMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="sticky top-0 z-10 flex justify-center py-2">
              <span className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-full shadow-sm">
                {formatDateDivider(group.messages[0].createdAt)}
              </span>
            </div>
            {group.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.authorId === currentUserId}
                canEdit={canEdit(message)}
                canDelete={canDelete(message)}
                canPin={canPin()}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onLike={onLikeMessage}
                onReact={onReactMessage}
                onPin={onPinMessage}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ))}

        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Be the first to start the conversation!</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="ml-1">
              {typingUsers.length === 1
                ? `${typingUsers[0].userName} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </span>
        </div>
      )}

      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-24 right-6 rounded-full shadow-lg z-20"
          onClick={() => scrollToBottom()}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}

      <MessageInput
        onSend={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
        disabled={!isMember}
        placeholder={isMember ? "Type a message..." : "Join the group to send messages"}
      />
    </div>
  );
}
