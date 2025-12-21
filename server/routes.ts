import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  authMiddleware,
  adminMiddleware,
  generateToken,
  hashPassword,
  comparePassword,
  verifyToken,
  type AuthRequest,
} from "./auth";
import { insertUserSchema, loginSchema, insertAnnouncementSchema, insertEventSchema, insertGroupSchema, insertGroupPostSchema, insertMessageSchema } from "@shared/schema";

const userConnections = new Map<string, WebSocket>();
const typingUsers = new Map<string, Map<string, { userName: string; timeout: NodeJS.Timeout }>>();

export function broadcastNotification(userId: string, notification: any) {
  const ws = userConnections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "notification", data: notification }));
  }
}

export function broadcastToAll(message: any) {
  for (const [_, ws] of userConnections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

export function broadcastToGroup(groupId: string, message: any, members: string[]) {
  for (const memberId of members) {
    const ws = userConnections.get(memberId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    
    if (!token) {
      ws.close(1008, "Authentication required");
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      ws.close(1008, "Invalid token");
      return;
    }

    userConnections.set(decoded.id, ws);
    console.log(`WebSocket connected for user: ${decoded.id}`);

    const notifications = await storage.getNotifications(decoded.id);
    ws.send(JSON.stringify({ type: "notifications", data: notifications }));

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "typing_start") {
          const { groupId } = message;
          const group = await storage.getGroup(groupId);
          if (!group) return;
          
          if (!typingUsers.has(groupId)) {
            typingUsers.set(groupId, new Map());
          }
          
          const groupTyping = typingUsers.get(groupId)!;
          
          if (groupTyping.has(decoded.id)) {
            clearTimeout(groupTyping.get(decoded.id)!.timeout);
          }
          
          const timeout = setTimeout(() => {
            groupTyping.delete(decoded.id);
            broadcastToGroup(groupId, {
              type: "typing_update",
              data: {
                groupId,
                typingUsers: Array.from(groupTyping.entries()).map(([id, u]) => ({ userId: id, userName: u.userName }))
              }
            }, group.members);
          }, 3000);
          
          groupTyping.set(decoded.id, { userName: decoded.fullName, timeout });
          
          broadcastToGroup(groupId, {
            type: "typing_update",
            data: {
              groupId,
              typingUsers: Array.from(groupTyping.entries()).map(([id, u]) => ({ userId: id, userName: u.userName }))
            }
          }, group.members.filter(m => m !== decoded.id));
        }
        
        if (message.type === "typing_stop") {
          const { groupId } = message;
          const group = await storage.getGroup(groupId);
          if (!group) return;
          
          const groupTyping = typingUsers.get(groupId);
          if (groupTyping) {
            const userData = groupTyping.get(decoded.id);
            if (userData) {
              clearTimeout(userData.timeout);
              groupTyping.delete(decoded.id);
            }
            
            broadcastToGroup(groupId, {
              type: "typing_update",
              data: {
                groupId,
                typingUsers: Array.from(groupTyping.entries()).map(([id, u]) => ({ userId: id, userName: u.userName }))
              }
            }, group.members.filter(m => m !== decoded.id));
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      userConnections.delete(decoded.id);
      for (const [groupId, groupTyping] of typingUsers) {
        if (groupTyping.has(decoded.id)) {
          clearTimeout(groupTyping.get(decoded.id)!.timeout);
          groupTyping.delete(decoded.id);
        }
      }
      console.log(`WebSocket disconnected for user: ${decoded.id}`);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      userConnections.delete(decoded.id);
    });
  });
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parseResult = insertUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
      }

      const { email, password, fullName, department, year } = parseResult.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ message: "Email already registered" });
        return;
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        fullName,
        department,
        year,
      });

      const { password: _, ...userWithoutPassword } = user;
      const token = generateToken(userWithoutPassword);

      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
      }

      const { email, password } = parseResult.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      const { password: _, ...userWithoutPassword } = user;
      const token = generateToken(userWithoutPassword);

      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/stats", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const notifications = await storage.getNotifications(req.user!.id);
      stats.unreadNotifications = notifications.filter((n) => !n.read).length;
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/announcements", authMiddleware, async (_req, res) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Get announcements error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/announcements", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const parseResult = insertAnnouncementSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
      }

      const announcement = await storage.createAnnouncement(
        parseResult.data,
        req.user!.id,
        req.user!.fullName
      );

      const students = await storage.getAllStudents();
      for (const student of students) {
        const notification = await storage.createNotification({
          userId: student.id,
          title: `New ${announcement.priority === "urgent" ? "Urgent " : announcement.priority === "important" ? "Important " : ""}Announcement`,
          message: announcement.title,
          type: "announcement",
          link: "/announcements",
        });
        broadcastNotification(student.id, notification);
      }

      broadcastToAll({ type: "announcement_created", data: announcement });

      res.status(201).json(announcement);
    } catch (error) {
      console.error("Create announcement error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/announcements/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAnnouncement(id);
      
      if (!deleted) {
        res.status(404).json({ message: "Announcement not found" });
        return;
      }

      res.json({ message: "Announcement deleted" });
    } catch (error) {
      console.error("Delete announcement error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups", authMiddleware, async (_req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error) {
      console.error("Get groups error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const parseResult = insertGroupSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
      }

      const group = await storage.createGroup(parseResult.data, req.user!.id);
      
      broadcastToAll({ type: "group_created", data: group });

      res.status(201).json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const group = await storage.getGroup(id);
      
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      res.json(group);
    } catch (error) {
      console.error("Get group error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/groups/:id/rules", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { rules } = req.body;
      
      const group = await storage.getGroup(id);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const role = await storage.getMemberRole(id, req.user!.id);
      if (role !== "creator" && role !== "admin" && req.user!.role !== "admin") {
        res.status(403).json({ message: "Only admins can update group rules" });
        return;
      }

      const updatedGroup = await storage.updateGroupRules(id, rules);
      res.json(updatedGroup);
    } catch (error) {
      console.error("Update group rules error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/groups/:id/members/:memberId/role", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id, memberId } = req.params;
      const { role } = req.body;
      
      if (!["admin", "moderator", "member"].includes(role)) {
        res.status(400).json({ message: "Invalid role" });
        return;
      }

      const group = await storage.getGroup(id);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const userRole = await storage.getMemberRole(id, req.user!.id);
      if (userRole !== "creator" && req.user!.role !== "admin") {
        res.status(403).json({ message: "Only group creator can change member roles" });
        return;
      }

      const updatedGroup = await storage.setMemberRole(id, memberId, role);
      
      broadcastToGroup(id, { type: "member_role_changed", data: { groupId: id, memberId, role } }, group.members);
      
      res.json(updatedGroup);
    } catch (error) {
      console.error("Set member role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/members", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const group = await storage.getGroup(id);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }
      
      const members = await storage.getGroupMembers(id);
      const membersWithRoles = members.map(member => ({
        ...member,
        groupRole: group.memberRoles[member.id] || "member"
      }));
      
      res.json(membersWithRoles);
    } catch (error) {
      console.error("Get group members error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/join", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const group = await storage.joinGroup(id, req.user!.id);
      
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const updatedUser = await storage.getUser(req.user!.id);
      if (!updatedUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { password: _, ...userWithoutPassword } = updatedUser;

      broadcastToGroup(id, { type: "member_joined", data: { groupId: id, user: userWithoutPassword } }, group.members);

      res.json({ group, user: userWithoutPassword });
    } catch (error) {
      console.error("Join group error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/leave", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const group = await storage.leaveGroup(id, req.user!.id);
      
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const updatedUser = await storage.getUser(req.user!.id);
      if (!updatedUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { password: _, ...userWithoutPassword } = updatedUser;

      broadcastToGroup(id, { type: "member_left", data: { groupId: id, userId: req.user!.id } }, group.members);

      res.json({ group, user: userWithoutPassword });
    } catch (error) {
      console.error("Leave group error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/posts", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      if (search) {
        const posts = await storage.searchGroupPosts(id, search);
        res.json({ posts, total: posts.length, hasMore: false });
      } else {
        const result = await storage.getGroupPosts(id, page, limit);
        res.json(result);
      }
    } catch (error) {
      console.error("Get group posts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/posts", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      const group = await storage.getGroup(id);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      if (!group.members.includes(req.user!.id)) {
        res.status(403).json({ message: "You must be a member to post in this group" });
        return;
      }

      const parseResult = insertGroupPostSchema.safeParse({ ...req.body, groupId: id });
      if (!parseResult.success) {
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
      }

      const post = await storage.createGroupPost(
        parseResult.data,
        req.user!.id,
        req.user!.fullName,
        req.user!.avatar
      );

      broadcastToGroup(id, { type: "group_post_created", data: post }, group.members);

      for (const memberId of group.members) {
        if (memberId !== req.user!.id) {
          const notification = await storage.createNotification({
            userId: memberId,
            title: "New Post in Group",
            message: `${req.user!.fullName} posted in ${group.name}`,
            type: "group",
            link: `/groups/${id}`,
          });
          broadcastNotification(memberId, notification);
        }
      }

      res.status(201).json(post);
    } catch (error) {
      console.error("Create group post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/groups/:groupId/posts/:postId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { groupId, postId } = req.params;
      
      const group = await storage.getGroup(groupId);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const post = await storage.getGroupPost(postId);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      const isAdmin = req.user!.role === "admin";
      const isCreator = group.createdBy === req.user!.id;
      const isAuthor = post.authorId === req.user!.id;
      const userRole = await storage.getMemberRole(groupId, req.user!.id);
      const isGroupAdmin = userRole === "creator" || userRole === "admin";

      if (!isAdmin && !isCreator && !isAuthor && !isGroupAdmin) {
        res.status(403).json({ message: "You don't have permission to delete this post" });
        return;
      }

      await storage.deleteGroupPost(postId);
      
      broadcastToGroup(groupId, { type: "group_post_deleted", data: { postId, groupId } }, group.members);

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Delete group post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:groupId/posts/:postId/like", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { groupId, postId } = req.params;
      
      const group = await storage.getGroup(groupId);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }
      
      const post = await storage.likeGroupPost(postId, req.user!.id);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      broadcastToGroup(groupId, { type: "group_post_liked", data: post }, group.members);

      res.json(post);
    } catch (error) {
      console.error("Like group post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;

      const group = await storage.getGroup(id);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      if (!group.members.includes(req.user!.id)) {
        res.status(403).json({ message: "You must be a member to view messages" });
        return;
      }

      if (search) {
        const messages = await storage.searchMessages(id, search);
        res.json({ messages, total: messages.length, hasMore: false });
      } else {
        const result = await storage.getMessages(id, page, limit);
        res.json(result);
      }
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      const group = await storage.getGroup(id);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      if (!group.members.includes(req.user!.id)) {
        res.status(403).json({ message: "You must be a member to send messages" });
        return;
      }

      const userRole = await storage.getMemberRole(id, req.user!.id);
      const memberData = group.memberRoles[req.user!.id];
      if (memberData === "member") {
      }

      const parseResult = insertMessageSchema.safeParse({ ...req.body, groupId: id });
      if (!parseResult.success) {
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
      }

      const message = await storage.createMessage(
        parseResult.data,
        req.user!.id,
        req.user!.fullName,
        req.user!.avatar
      );

      broadcastToGroup(id, { type: "message_created", data: message }, group.members);

      for (const memberId of group.members) {
        if (memberId !== req.user!.id) {
          const notification = await storage.createNotification({
            userId: memberId,
            title: `New message in ${group.name}`,
            message: `${req.user!.fullName}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
            type: "message",
            link: `/groups/${id}`,
          });
          broadcastNotification(memberId, notification);
        }
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/messages/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        res.status(400).json({ message: "Message content is required" });
        return;
      }

      const message = await storage.getMessage(id);
      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const group = await storage.getGroup(message.groupId);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const isAuthor = message.authorId === req.user!.id;
      const userRole = await storage.getMemberRole(message.groupId, req.user!.id);
      const isGroupAdmin = userRole === "creator" || userRole === "admin";

      if (!isAuthor && !isGroupAdmin && req.user!.role !== "admin") {
        res.status(403).json({ message: "You don't have permission to edit this message" });
        return;
      }

      const updatedMessage = await storage.editMessage(id, content.trim());
      
      broadcastToGroup(message.groupId, { type: "message_edited", data: updatedMessage }, group.members);

      res.json(updatedMessage);
    } catch (error) {
      console.error("Edit message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/messages/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const message = await storage.getMessage(id);
      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const group = await storage.getGroup(message.groupId);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const isAuthor = message.authorId === req.user!.id;
      const userRole = await storage.getMemberRole(message.groupId, req.user!.id);
      const isGroupAdmin = userRole === "creator" || userRole === "admin" || userRole === "moderator";

      if (!isAuthor && !isGroupAdmin && req.user!.role !== "admin") {
        res.status(403).json({ message: "You don't have permission to delete this message" });
        return;
      }

      await storage.deleteMessage(id);
      
      broadcastToGroup(message.groupId, { type: "message_deleted", data: { messageId: id, groupId: message.groupId } }, group.members);

      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/messages/:id/like", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const message = await storage.getMessage(id);
      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const group = await storage.getGroup(message.groupId);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      if (!group.members.includes(req.user!.id)) {
        res.status(403).json({ message: "You must be a member to like messages" });
        return;
      }

      const updatedMessage = await storage.likeMessage(id, req.user!.id);
      
      broadcastToGroup(message.groupId, { type: "message_liked", data: updatedMessage }, group.members);

      res.json(updatedMessage);
    } catch (error) {
      console.error("Like message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/messages/:id/react", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { emoji } = req.body;

      if (!emoji || typeof emoji !== "string") {
        res.status(400).json({ message: "Emoji is required" });
        return;
      }

      const message = await storage.getMessage(id);
      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const group = await storage.getGroup(message.groupId);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      if (!group.members.includes(req.user!.id)) {
        res.status(403).json({ message: "You must be a member to react to messages" });
        return;
      }

      const updatedMessage = await storage.addReaction(id, emoji, req.user!.id);
      
      broadcastToGroup(message.groupId, { type: "message_reacted", data: updatedMessage }, group.members);

      res.json(updatedMessage);
    } catch (error) {
      console.error("React to message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/messages/:id/pin", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const message = await storage.getMessage(id);
      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const group = await storage.getGroup(message.groupId);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const userRole = await storage.getMemberRole(message.groupId, req.user!.id);
      if (userRole !== "creator" && userRole !== "admin" && req.user!.role !== "admin") {
        res.status(403).json({ message: "Only admins can pin messages" });
        return;
      }

      const updatedMessage = await storage.pinMessage(id);
      
      broadcastToGroup(message.groupId, { type: "message_pinned", data: updatedMessage }, group.members);

      res.json(updatedMessage);
    } catch (error) {
      console.error("Pin message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/messages/:id/pin", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const message = await storage.getMessage(id);
      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const group = await storage.getGroup(message.groupId);
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      const userRole = await storage.getMemberRole(message.groupId, req.user!.id);
      if (userRole !== "creator" && userRole !== "admin" && req.user!.role !== "admin") {
        res.status(403).json({ message: "Only admins can unpin messages" });
        return;
      }

      const updatedMessage = await storage.unpinMessage(id);
      
      broadcastToGroup(message.groupId, { type: "message_unpinned", data: updatedMessage }, group.members);

      res.json(updatedMessage);
    } catch (error) {
      console.error("Unpin message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events", authMiddleware, async (_req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const parseResult = insertEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
      }

      const event = await storage.createEvent(parseResult.data, req.user!.id);

      const students = await storage.getAllStudents();
      for (const student of students) {
        const notification = await storage.createNotification({
          userId: student.id,
          title: "New Event Added",
          message: `${event.title} on ${new Date(event.date).toLocaleDateString()}`,
          type: "event",
          link: "/events",
        });
        broadcastNotification(student.id, notification);
      }

      broadcastToAll({ type: "event_created", data: event });

      res.status(201).json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getEvent(id);
      
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      res.json(event);
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/events/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteEvent(id);
      
      if (!deleted) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      res.json({ message: "Event deleted" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/register", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const event = await storage.registerForEvent(id, req.user!.id);
      if (!event) {
        res.status(400).json({ message: "Cannot register for event" });
        return;
      }
      
      // Create registration notification
      const user = await storage.getUser(req.user!.id);
      if (user && user.notificationPreferences.eventRegistration) {
        const notification = await storage.createNotification({
          userId: req.user!.id,
          title: "Registration Confirmed",
          message: `You've successfully registered for ${event.title} on ${new Date(event.date).toLocaleDateString()}`,
          type: "event",
          link: `/events/${event.id}`,
          eventId: event.id,
        });
        broadcastNotification(req.user!.id, notification);
      }
      
      broadcastToAll({ type: "event_registration_update", data: event });
      res.json(event);
    } catch (error) {
      console.error("Register event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/unregister", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const event = await storage.unregisterFromEvent(id, req.user!.id);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      broadcastToAll({ type: "event_registration_update", data: event });
      res.json(event);
    } catch (error) {
      console.error("Unregister event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/save", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.saveEvent(id, req.user!.id);
      res.json({ message: "Event saved" });
    } catch (error) {
      console.error("Save event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events/:id/unsave", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.unsaveEvent(id, req.user!.id);
      res.json({ message: "Event unsaved" });
    } catch (error) {
      console.error("Unsave event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/saved", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const events = await storage.getSavedEvents(req.user!.id);
      res.json(events);
    } catch (error) {
      console.error("Get saved events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/category/:category", authMiddleware, async (req, res) => {
    try {
      const { category } = req.params;
      const events = await storage.getEventsByCategory(category);
      res.json(events);
    } catch (error) {
      console.error("Get events by category error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/upcoming/:days", authMiddleware, async (req, res) => {
    try {
      const days = parseInt(req.params.days || "30", 10);
      const events = await storage.getUpcomingEvents(days);
      res.json(events);
    } catch (error) {
      console.error("Get upcoming events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/recommended", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const events = await storage.getRecommendedEvents(req.user!.id);
      res.json(events);
    } catch (error) {
      console.error("Get recommended events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/notifications", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const notifications = await storage.getNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/mark-all-read", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/profile", authMiddleware, async (req: AuthRequest, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/profile", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { fullName, department, year } = req.body;

      const updatedUser = await storage.updateUser(req.user!.id, {
        fullName: fullName || req.user!.fullName,
        department: department || req.user!.department,
        year: year || req.user!.year,
      });

      if (!updatedUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/students", authMiddleware, adminMiddleware, async (_req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (_req, res) => {
    try {
      const users = await storage.getAllStudents();
      res.json(users);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { role, fullName, department, year } = req.body;

      const updatedUser = await storage.updateUser(id, {
        role: role || undefined,
        fullName: fullName || undefined,
        department: department || undefined,
        year: year || undefined,
      });

      if (!updatedUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (id === req.user!.id) {
        res.status(400).json({ message: "Cannot delete your own account" });
        return;
      }

      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/groups", authMiddleware, adminMiddleware, async (_req, res) => {
    try {
      const groups = await storage.getAllGroups();
      res.json(groups);
    } catch (error) {
      console.error("Get groups error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/groups/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGroup(id);
      if (!deleted) {
        res.status(404).json({ message: "Group not found" });
        return;
      }
      broadcastToAll({ type: "group_deleted", data: { id } });
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Delete group error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (_req, res) => {
    try {
      const totalUsers = (await storage.getAllStudents()).length;
      const stats = await storage.getDashboardStats();
      const allGroups = await storage.getAllGroups();
      const allEvents = await storage.getAllEvents();

      res.json({
        totalUsers,
        totalGroups: allGroups.length,
        totalEvents: allEvents.length,
        totalAnnouncements: stats.totalAnnouncements,
        upcomingEvents: stats.upcomingEvents,
        unreadNotifications: stats.unreadNotifications,
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
