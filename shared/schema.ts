import { z } from "zod";

export const departments = [
  "Computer Science",
  "Electrical Engineering", 
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Arts & Humanities",
  "Natural Sciences",
  "Mathematics",
  "Psychology",
  "Economics",
] as const;

export const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"] as const;

export const priorities = ["normal", "important", "urgent"] as const;

export const userRoles = ["student", "admin"] as const;

export const groupRoles = ["creator", "admin", "moderator", "member"] as const;

export const messageTypes = ["text", "image", "file"] as const;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  department: z.enum(departments),
  year: z.enum(years),
  role: z.enum(userRoles).default("student"),
  avatar: z.string().optional(),
  joinedGroups: z.array(z.string()).default([]),
  notificationPreferences: z.object({
    eventRegistration: z.boolean().default(true),
    eventReminders24h: z.boolean().default(true),
    eventReminders1h: z.boolean().default(true),
  }).default({ eventRegistration: true, eventReminders24h: true, eventReminders1h: true }),
});

export const insertUserSchema = userSchema.omit({ id: true, joinedGroups: true, role: true, notificationPreferences: true });
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

export const announcementSchema = z.object({
  id: z.string(),
  title: z.string().min(3),
  description: z.string().min(10),
  priority: z.enum(priorities).default("normal"),
  createdAt: z.string(),
  createdBy: z.string(),
  authorName: z.string(),
});

export const insertAnnouncementSchema = announcementSchema.omit({ 
  id: true, 
  createdAt: true, 
  createdBy: true,
  authorName: true 
});

export type Announcement = z.infer<typeof announcementSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export const groupMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(groupRoles),
  joinedAt: z.string(),
  lastActiveAt: z.string().optional(),
  isMuted: z.boolean().default(false),
});

export type GroupMember = z.infer<typeof groupMemberSchema>;

export const groupSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  description: z.string(),
  category: z.string(),
  department: z.enum(departments).optional(),
  memberCount: z.number().default(0),
  members: z.array(z.string()).default([]),
  memberRoles: z.record(z.string(), z.enum(groupRoles)).default({}),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  icon: z.string().optional(),
  postsCount: z.number().default(0),
  messagesCount: z.number().default(0),
  rules: z.string().optional(),
  pinnedMessages: z.array(z.string()).default([]),
  lastActivityAt: z.string().optional(),
});

export const insertGroupSchema = groupSchema.omit({ 
  id: true, 
  memberCount: true, 
  members: true,
  memberRoles: true,
  createdAt: true,
  createdBy: true,
  postsCount: true,
  messagesCount: true,
  pinnedMessages: true,
  lastActivityAt: true,
});

export type Group = z.infer<typeof groupSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export const groupPostSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorAvatar: z.string().optional(),
  content: z.string().min(1),
  createdAt: z.string(),
  likes: z.number().default(0),
  likedBy: z.array(z.string()).default([]),
});

export const insertGroupPostSchema = groupPostSchema.omit({ 
  id: true, 
  createdAt: true,
  authorId: true,
  authorName: true,
  authorAvatar: true,
  likes: true,
  likedBy: true,
});

export type GroupPost = z.infer<typeof groupPostSchema>;
export type InsertGroupPost = z.infer<typeof insertGroupPostSchema>;

export const messageSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorAvatar: z.string().optional(),
  content: z.string(),
  type: z.enum(messageTypes).default("text"),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  createdAt: z.string(),
  editedAt: z.string().optional(),
  likes: z.number().default(0),
  likedBy: z.array(z.string()).default([]),
  reactions: z.record(z.string(), z.array(z.string())).default({}),
  replyTo: z.string().optional(),
  isPinned: z.boolean().default(false),
});

export const insertMessageSchema = messageSchema.omit({
  id: true,
  authorId: true,
  authorName: true,
  authorAvatar: true,
  createdAt: true,
  editedAt: true,
  likes: true,
  likedBy: true,
  reactions: true,
  isPinned: true,
});

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const eventCategories = ["Academic", "Sports", "Cultural", "Workshops", "Competitions"] as const;

export const eventSchema = z.object({
  id: z.string(),
  title: z.string().min(3),
  description: z.string(),
  date: z.string(),
  time: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string(),
  category: z.enum(eventCategories).optional(),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().optional(),
  requiresRegistration: z.boolean().default(false),
  maxParticipants: z.number().optional(),
  currentParticipants: z.number().default(0),
  cancelled: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: z.string(),
});

export const insertEventSchema = eventSchema.omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  currentParticipants: true,
});

export type Event = z.infer<typeof eventSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(["announcement", "event", "group", "message", "system", "reminder"]),
  read: z.boolean().default(false),
  createdAt: z.string(),
  link: z.string().optional(),
  eventId: z.string().optional(),
  reminderType: z.enum(["24h", "1h"]).optional(),
});

export const insertNotificationSchema = notificationSchema.omit({ 
  id: true, 
  createdAt: true,
  read: true 
});

export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export interface AuthResponse {
  user: Omit<User, "password">;
  token: string;
}

export interface DashboardStats {
  totalAnnouncements: number;
  totalGroups: number;
  upcomingEvents: number;
  unreadNotifications: number;
}

export interface TypingIndicator {
  groupId: string;
  userId: string;
  userName: string;
}
