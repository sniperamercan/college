import { randomUUID } from "crypto";
import type {
  User,
  InsertUser,
  Announcement,
  InsertAnnouncement,
  Group,
  InsertGroup,
  GroupPost,
  InsertGroupPost,
  Event,
  InsertEvent,
  Notification,
  InsertNotification,
  DashboardStats,
  Message,
  InsertMessage,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: "student" | "admin" }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllStudents(): Promise<Omit<User, "password">[]>;

  getAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement, userId: string, authorName: string): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<boolean>;

  getGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup, userId: string): Promise<Group>;
  joinGroup(groupId: string, userId: string): Promise<Group | undefined>;
  leaveGroup(groupId: string, userId: string): Promise<Group | undefined>;
  getGroupMembers(groupId: string): Promise<Omit<User, "password">[]>;
  updateGroupRules(groupId: string, rules: string): Promise<Group | undefined>;
  setMemberRole(groupId: string, userId: string, role: "admin" | "moderator" | "member"): Promise<Group | undefined>;
  getMemberRole(groupId: string, userId: string): Promise<string | undefined>;

  getGroupPosts(groupId: string, page?: number, limit?: number): Promise<{ posts: GroupPost[]; total: number; hasMore: boolean }>;
  getGroupPost(postId: string): Promise<GroupPost | undefined>;
  createGroupPost(post: InsertGroupPost, userId: string, authorName: string, authorAvatar?: string): Promise<GroupPost>;
  deleteGroupPost(postId: string): Promise<boolean>;
  likeGroupPost(postId: string, userId: string): Promise<GroupPost | undefined>;
  searchGroupPosts(groupId: string, query: string): Promise<GroupPost[]>;

  getMessages(groupId: string, page?: number, limit?: number): Promise<{ messages: Message[]; total: number; hasMore: boolean }>;
  getMessage(messageId: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage, userId: string, authorName: string, authorAvatar?: string): Promise<Message>;
  editMessage(messageId: string, content: string): Promise<Message | undefined>;
  deleteMessage(messageId: string): Promise<boolean>;
  likeMessage(messageId: string, userId: string): Promise<Message | undefined>;
  addReaction(messageId: string, emoji: string, userId: string): Promise<Message | undefined>;
  pinMessage(messageId: string): Promise<Message | undefined>;
  unpinMessage(messageId: string): Promise<Message | undefined>;
  searchMessages(groupId: string, query: string): Promise<Message[]>;

  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent, userId: string): Promise<Event>;
  deleteEvent(id: string): Promise<boolean>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  registerForEvent(eventId: string, userId: string): Promise<Event | undefined>;
  unregisterFromEvent(eventId: string, userId: string): Promise<Event | undefined>;
  saveEvent(eventId: string, userId: string): Promise<boolean>;
  unsaveEvent(eventId: string, userId: string): Promise<boolean>;
  getSavedEvents(userId: string): Promise<Event[]>;
  getEventsByCategory(category: string): Promise<Event[]>;
  getUpcomingEvents(days?: number): Promise<Event[]>;
  getRecommendedEvents(userId: string): Promise<Event[]>;

  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getDashboardStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private announcements: Map<string, Announcement>;
  private groups: Map<string, Group>;
  private groupPosts: Map<string, GroupPost>;
  private messages: Map<string, Message>;
  private events: Map<string, Event>;
  private notifications: Map<string, Notification>;
  private eventRegistrations: Map<string, Set<string>>;
  private savedEvents: Map<string, Set<string>>;
  private sentReminders: Set<string>;

  constructor() {
    this.users = new Map();
    this.announcements = new Map();
    this.groups = new Map();
    this.groupPosts = new Map();
    this.messages = new Map();
    this.events = new Map();
    this.notifications = new Map();
    this.eventRegistrations = new Map();
    this.savedEvents = new Map();
    this.sentReminders = new Set();

    this.seedData();
    this.scheduleEventReminders();
  }

  private seedData() {
    const adminId = randomUUID();
    const adminUser: User = {
      id: adminId,
      email: "admin@campus.edu",
      password: "$2b$10$MWyqHdDyFE1pyVnmaZFgcOw.fQBUxYOD1EqLyE3j8RLeblLRaGGrK",
      fullName: "Campus Administrator",
      department: "Computer Science",
      year: "Graduate",
      role: "admin",
      joinedGroups: [],
      notificationPreferences: {
        eventRegistration: true,
        eventReminders24h: true,
        eventReminders1h: true,
      },
    };
    this.users.set(adminId, adminUser);

    const demoUsers = [
      { email: "john.doe@campus.edu", fullName: "John Doe", department: "Computer Science" as const, year: "3rd Year" as const, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john" },
      { email: "jane.smith@campus.edu", fullName: "Jane Smith", department: "Electrical Engineering" as const, year: "2nd Year" as const, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane" },
      { email: "mike.johnson@campus.edu", fullName: "Mike Johnson", department: "Computer Science" as const, year: "4th Year" as const, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike" },
      { email: "sarah.wilson@campus.edu", fullName: "Sarah Wilson", department: "Mathematics" as const, year: "Graduate" as const, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
      { email: "david.brown@campus.edu", fullName: "David Brown", department: "Computer Science" as const, year: "1st Year" as const, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david" },
    ];

    const demoUserIds: string[] = [];
    demoUsers.forEach((u) => {
      const id = randomUUID();
      demoUserIds.push(id);
      this.users.set(id, {
        ...u,
        id,
        password: "$2a$10$xVWsO1J8kQf8QWq3JnXZPuQXLV6Q8nJ8kQf8QWq3JnXZPuQXLV6Q8",
        role: "student",
        joinedGroups: [],
        notificationPreferences: {
          eventRegistration: true,
          eventReminders24h: true,
          eventReminders1h: true,
        },
      });
    });

    const groups: (InsertGroup & { initialMembers: number })[] = [
      { name: "Programming Club", description: "A community for coding enthusiasts! We host weekly coding challenges, hackathons, and collaborative projects.", category: "Technology", department: "Computer Science", rules: "1. Be respectful\n2. No spam\n3. Help others learn", initialMembers: 45 },
      { name: "AI & Machine Learning", description: "Explore the cutting edge of artificial intelligence and machine learning with hands-on projects.", category: "Technology", department: "Computer Science", rules: "1. Share resources\n2. Ask questions\n3. Collaborate on projects", initialMembers: 38 },
      { name: "Robotics Team", description: "Build, program, and compete! Our robotics team participates in national competitions.", category: "Engineering", department: "Electrical Engineering", rules: "1. Safety first\n2. Document your work\n3. Team collaboration", initialMembers: 28 },
      { name: "Web Development Guild", description: "From HTML basics to advanced React and Node.js - master the art of web development.", category: "Technology", department: "Computer Science", rules: "1. Share code snippets\n2. Review each other's work\n3. Stay updated", initialMembers: 52 },
      { name: "Data Science Society", description: "Turn data into insights! Learn statistical analysis, visualization, and machine learning.", category: "Technology", department: "Mathematics", rules: "1. Share datasets ethically\n2. Explain your methods\n3. Reproducible results", initialMembers: 41 },
    ];

    const groupIds: string[] = [];
    groups.forEach((g, index) => {
      const id = randomUUID();
      groupIds.push(id);
      const { initialMembers, ...groupData } = g;
      const membersList = demoUserIds.slice(0, Math.min(4, index + 2));
      const memberRoles: Record<string, "creator" | "admin" | "moderator" | "member"> = {};
      
      membersList.forEach((userId, idx) => {
        const user = this.users.get(userId);
        if (user && !user.joinedGroups.includes(id)) {
          user.joinedGroups.push(id);
        }
        if (idx === 0) {
          memberRoles[userId] = "admin";
        } else if (idx === 1) {
          memberRoles[userId] = "moderator";
        } else {
          memberRoles[userId] = "member";
        }
      });

      memberRoles[adminId] = "creator";

      this.groups.set(id, {
        ...groupData,
        id,
        memberCount: initialMembers,
        members: [...membersList, adminId],
        memberRoles,
        createdBy: adminId,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        postsCount: 0,
        messagesCount: 0,
        pinnedMessages: [],
        lastActivityAt: new Date().toISOString(),
      });

      const samplePosts = [
        "Welcome to our group! Looking forward to collaborating with everyone.",
        "Just finished an amazing project - check it out!",
        "Anyone interested in joining the upcoming workshop?",
      ];

      const numPosts = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < numPosts; i++) {
        const postId = randomUUID();
        const authorIndex = Math.floor(Math.random() * membersList.length);
        const author = this.users.get(membersList[authorIndex])!;
        this.groupPosts.set(postId, {
          id: postId,
          groupId: id,
          authorId: membersList[authorIndex],
          authorName: author.fullName,
          authorAvatar: author.avatar,
          content: samplePosts[i % samplePosts.length],
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          likes: Math.floor(Math.random() * 10),
          likedBy: [],
        });
      }

      const group = this.groups.get(id)!;
      group.postsCount = numPosts;
      this.groups.set(id, group);

      const sampleMessages = [
        { content: "Hey everyone! Excited to be part of this group!", type: "text" as const },
        { content: "Has anyone started working on the new project yet?", type: "text" as const },
        { content: "I found this great tutorial, sharing it here", type: "text" as const },
        { content: "Great work on the last assignment team!", type: "text" as const },
        { content: "Meeting tomorrow at 3 PM, don't forget!", type: "text" as const },
        { content: "Just pushed my code to the repo, please review", type: "text" as const },
        { content: "Anyone up for a study session this weekend?", type: "text" as const },
        { content: "Here's the resource link I mentioned earlier", type: "text" as const },
        { content: "The deadline has been extended by 2 days", type: "text" as const },
        { content: "Welcome to all new members! Feel free to introduce yourselves", type: "text" as const },
      ];

      const numMessages = 8 + Math.floor(Math.random() * 5);
      for (let i = 0; i < numMessages; i++) {
        const messageId = randomUUID();
        const authorIndex = Math.floor(Math.random() * membersList.length);
        const author = this.users.get(membersList[authorIndex])!;
        const msgData = sampleMessages[i % sampleMessages.length];
        const createdAt = new Date(Date.now() - (numMessages - i) * 3600000 - Math.random() * 1800000).toISOString();
        
        const reactions: Record<string, string[]> = {};
        if (Math.random() > 0.7) {
          const emojis = ["👍", "❤️", "🎉", "🔥", "👏"];
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          reactions[emoji] = [membersList[Math.floor(Math.random() * membersList.length)]];
        }

        this.messages.set(messageId, {
          id: messageId,
          groupId: id,
          authorId: membersList[authorIndex],
          authorName: author.fullName,
          authorAvatar: author.avatar,
          content: msgData.content,
          type: msgData.type,
          createdAt,
          likes: Math.floor(Math.random() * 5),
          likedBy: [],
          reactions,
          isPinned: i === 0 && index === 0,
        });
      }

      const updatedGroup = this.groups.get(id)!;
      updatedGroup.messagesCount = numMessages;
      if (index === 0) {
        const firstMsgId = Array.from(this.messages.values()).find(m => m.groupId === id && m.isPinned)?.id;
        if (firstMsgId) {
          updatedGroup.pinnedMessages = [firstMsgId];
        }
      }
      this.groups.set(id, updatedGroup);
    });

    const announcements: Array<Omit<InsertAnnouncement, "priority"> & { priority: "normal" | "important" | "urgent" }> = [
      {
        title: "Fall Semester Registration Opens",
        description: "Course registration for Fall 2024 begins next Monday. Please ensure you meet with your academic advisor before registering.",
        priority: "urgent",
      },
      {
        title: "Library Extended Hours During Finals",
        description: "The main library will be open 24/7 during finals week (Dec 10-20).",
        priority: "important",
      },
      {
        title: "Campus Wi-Fi Maintenance",
        description: "Scheduled maintenance for campus Wi-Fi networks will occur this Saturday from 2 AM to 6 AM.",
        priority: "normal",
      },
    ];

    announcements.forEach((a) => {
      const id = randomUUID();
      this.announcements.set(id, {
        ...a,
        id,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: adminId,
        authorName: "Campus Administrator",
      });
    });

    const futureEvents = [
      // Academic Events
      {
        title: "AI Workshop",
        description: "Introduction to AI and Machine Learning with hands-on projects.",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "11:00 AM - 1:00 PM",
        startTime: "11:00 AM",
        endTime: "1:00 PM",
        location: "Tech Lab 201",
        category: "Academic" as const,
        tags: ["AI", "Machine Learning", "Workshop"],
        imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      {
        title: "Data Science Seminar",
        description: "Advanced statistical analysis and data visualization techniques with real-world case studies.",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "2:00 PM - 4:00 PM",
        startTime: "2:00 PM",
        endTime: "4:00 PM",
        location: "Science Building Room 305",
        category: "Academic" as const,
        tags: ["Data Science", "Statistics", "Analytics"],
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 30,
        cancelled: false,
      },
      {
        title: "Python Programming Bootcamp",
        description: "Intensive 3-day Python programming course for beginners to intermediate level.",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "9:00 AM - 12:00 PM",
        startTime: "9:00 AM",
        endTime: "12:00 PM",
        location: "Computer Lab 101",
        category: "Academic" as const,
        tags: ["Python", "Programming", "Bootcamp"],
        imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 25,
        cancelled: false,
      },
      // Workshops
      {
        title: "Tech Career Fair",
        description: "Annual technology career fair featuring 50+ companies and hundreds of job opportunities.",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "10:00 AM - 4:00 PM",
        startTime: "10:00 AM",
        endTime: "4:00 PM",
        location: "Student Union Ballroom",
        category: "Workshops" as const,
        tags: ["Career", "Technology", "Internship", "Job Fair"],
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 200,
        cancelled: false,
      },
      {
        title: "Graphic Design Masterclass",
        description: "Learn professional design principles from industry experts. All tools provided.",
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "1:00 PM - 5:00 PM",
        startTime: "1:00 PM",
        endTime: "5:00 PM",
        location: "Art Building Studio A",
        category: "Workshops" as const,
        tags: ["Design", "Graphics", "Creative"],
        imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 20,
        cancelled: false,
      },
      {
        title: "Web Development Bootcamp",
        description: "Full-stack web development workshop covering frontend and backend technologies.",
        date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "10:00 AM - 3:00 PM",
        startTime: "10:00 AM",
        endTime: "3:00 PM",
        location: "Tech Center 202",
        category: "Workshops" as const,
        tags: ["Web Dev", "Full Stack", "JavaScript"],
        imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 35,
        cancelled: false,
      },
      // Competitions
      {
        title: "Hackathon 2024",
        description: "48-hour coding competition with prizes worth $10,000. Form teams of 2-4.",
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "6:00 PM Friday - 6:00 PM Sunday",
        startTime: "6:00 PM",
        endTime: "6:00 PM",
        location: "Engineering Building",
        category: "Competitions" as const,
        tags: ["Programming", "Competition", "Prize", "Coding"],
        imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 100,
        cancelled: false,
      },
      {
        title: "Business Plan Competition",
        description: "Showcase your entrepreneurial ideas and compete for $5,000 in funding.",
        date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "3:00 PM - 6:00 PM",
        startTime: "3:00 PM",
        endTime: "6:00 PM",
        location: "Business School Auditorium",
        category: "Competitions" as const,
        tags: ["Business", "Entrepreneurship", "Pitch"],
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 50,
        cancelled: false,
      },
      {
        title: "Debate Championship",
        description: "Annual debate competition featuring teams from multiple universities.",
        date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "9:00 AM - 5:00 PM",
        startTime: "9:00 AM",
        endTime: "5:00 PM",
        location: "Student Center Main Hall",
        category: "Competitions" as const,
        tags: ["Debate", "Public Speaking", "Competition"],
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 30,
        cancelled: false,
      },
      // Sports
      {
        title: "Football Tournament",
        description: "Inter-departmental football tournament with exciting matches and prizes.",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "2:00 PM - 6:00 PM",
        startTime: "2:00 PM",
        endTime: "6:00 PM",
        location: "Sports Field",
        category: "Sports" as const,
        tags: ["Football", "Sports", "Tournament", "Athletics"],
        imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 50,
        cancelled: false,
      },
      {
        title: "Basketball Championship",
        description: "5-on-5 basketball tournament for all skill levels.",
        date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "1:00 PM - 9:00 PM",
        startTime: "1:00 PM",
        endTime: "9:00 PM",
        location: "Sports Arena Court 1-3",
        category: "Sports" as const,
        tags: ["Basketball", "Sports", "Tournament"],
        imageUrl: "https://images.unsplash.com/photo-1546519638-68711109d298?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 80,
        cancelled: false,
      },
      {
        title: "Tennis Open",
        description: "Open tennis tournament featuring singles and doubles categories.",
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "10:00 AM - 4:00 PM",
        startTime: "10:00 AM",
        endTime: "4:00 PM",
        location: "Tennis Courts",
        category: "Sports" as const,
        tags: ["Tennis", "Sports", "Individual"],
        imageUrl: "https://images.unsplash.com/photo-1554224311-beee415c201e?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      {
        title: "Campus Marathon",
        description: "5K/10K/Half Marathon run around campus. All fitness levels welcome.",
        date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "7:00 AM - 12:00 PM",
        startTime: "7:00 AM",
        endTime: "12:00 PM",
        location: "Campus Entrance",
        category: "Sports" as const,
        tags: ["Running", "Marathon", "Fitness"],
        imageUrl: "https://images.unsplash.com/photo-1552674605-5defe6aa44bb?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      // Cultural
      {
        title: "Annual Music Festival",
        description: "Multi-genre music festival featuring student and professional performers.",
        date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "5:00 PM - 11:00 PM",
        startTime: "5:00 PM",
        endTime: "11:00 PM",
        location: "Campus Amphitheater",
        category: "Cultural" as const,
        tags: ["Music", "Festival", "Entertainment", "Culture"],
        imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      {
        title: "International Food Fair",
        description: "Taste cuisines from around the world prepared by student organizations.",
        date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "12:00 PM - 6:00 PM",
        startTime: "12:00 PM",
        endTime: "6:00 PM",
        location: "Student Commons",
        category: "Cultural" as const,
        tags: ["Food", "Culture", "International", "Celebration"],
        imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561341?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      {
        title: "Theater Production: Romeo & Juliet",
        description: "Shakespeare's classic reimagined by the university theater department.",
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "7:00 PM - 10:00 PM",
        startTime: "7:00 PM",
        endTime: "10:00 PM",
        location: "Performance Hall",
        category: "Cultural" as const,
        tags: ["Theater", "Drama", "Arts", "Performance"],
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 200,
        cancelled: false,
      },
      {
        title: "Art Exhibition: Contemporary Works",
        description: "Display of contemporary art by students from the fine arts department.",
        date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "10:00 AM - 6:00 PM",
        startTime: "10:00 AM",
        endTime: "6:00 PM",
        location: "Art Gallery",
        category: "Cultural" as const,
        tags: ["Art", "Exhibition", "Contemporary", "Creative"],
        imageUrl: "https://images.unsplash.com/photo-1561214115-6d2f1b0609fa?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      // Additional Events - All Categories with Various Configurations
      // Academic Events
      {
        title: "Quantum Computing Seminar",
        description: "Explore quantum computing fundamentals and its applications in solving complex problems.",
        date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "3:00 PM - 5:00 PM",
        startTime: "3:00 PM",
        endTime: "5:00 PM",
        location: "Science Center Auditorium",
        category: "Academic" as const,
        tags: ["Quantum", "Computing", "Physics"],
        imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 40,
        cancelled: false,
      },
      {
        title: "Cybersecurity 101",
        description: "Learn essential cybersecurity principles and best practices for protecting digital assets.",
        date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "10:00 AM - 12:00 PM",
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        location: "Tech Building 301",
        category: "Academic" as const,
        tags: ["Security", "Technology", "Safety"],
        imageUrl: "https://images.unsplash.com/photo-1550751827-4bd94c3f153b?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      // Sports Events
      {
        title: "Badminton Tournament",
        description: "Singles and doubles badminton competition for all skill levels.",
        date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "4:00 PM - 8:00 PM",
        startTime: "4:00 PM",
        endTime: "8:00 PM",
        location: "Sports Complex Court B",
        category: "Sports" as const,
        tags: ["Badminton", "Sports", "Competition"],
        imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 40,
        cancelled: false,
      },
      {
        title: "Volleyball Championship",
        description: "6-on-6 volleyball tournament featuring competitive and recreational divisions.",
        date: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "2:00 PM - 8:00 PM",
        startTime: "2:00 PM",
        endTime: "8:00 PM",
        location: "Gymnasium Main Court",
        category: "Sports" as const,
        tags: ["Volleyball", "Sports", "Tournament"],
        imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 120,
        cancelled: false,
      },
      {
        title: "Yoga & Wellness Session",
        description: "Free outdoor yoga and wellness session led by certified instructors.",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "7:00 AM - 8:30 AM",
        startTime: "7:00 AM",
        endTime: "8:30 AM",
        location: "Campus Green",
        category: "Sports" as const,
        tags: ["Yoga", "Wellness", "Health"],
        imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      // Cultural Events
      {
        title: "Film Festival",
        description: "Screening of independent films from student filmmakers and international directors.",
        date: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "6:00 PM - 10:00 PM",
        startTime: "6:00 PM",
        endTime: "10:00 PM",
        location: "Cinema Hall",
        category: "Cultural" as const,
        tags: ["Film", "Cinema", "Entertainment"],
        imageUrl: "https://images.unsplash.com/photo-1545294202-18e340ee612e?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      {
        title: "Poetry Slam Night",
        description: "Open mic poetry slam featuring student poets sharing their original work.",
        date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "7:00 PM - 9:30 PM",
        startTime: "7:00 PM",
        endTime: "9:30 PM",
        location: "Student Union Lounge",
        category: "Cultural" as const,
        tags: ["Poetry", "Literature", "Arts"],
        imageUrl: "https://images.unsplash.com/photo-150784272343-583f20270319?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      {
        title: "Dance Performance Showcase",
        description: "Contemporary dance performances by student dance groups.",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "6:00 PM - 8:00 PM",
        startTime: "6:00 PM",
        endTime: "8:00 PM",
        location: "Performance Theater",
        category: "Cultural" as const,
        tags: ["Dance", "Performance", "Arts"],
        imageUrl: "https://images.unsplash.com/photo-1508700115892-8f8c44185590?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 250,
        cancelled: false,
      },
      // Workshops
      {
        title: "Resume & Interview Prep",
        description: "Professional development workshop on resume writing and interview techniques.",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "2:00 PM - 4:00 PM",
        startTime: "2:00 PM",
        endTime: "4:00 PM",
        location: "Career Services Building",
        category: "Workshops" as const,
        tags: ["Career", "Development", "Skills"],
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 50,
        cancelled: false,
      },
      {
        title: "Mobile App Development",
        description: "Learn to build iOS and Android applications from scratch.",
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "10:00 AM - 1:00 PM",
        startTime: "10:00 AM",
        endTime: "1:00 PM",
        location: "Tech Lab 205",
        category: "Workshops" as const,
        tags: ["Mobile", "App", "Development"],
        imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 25,
        cancelled: false,
      },
      {
        title: "Photography Basics",
        description: "Learn composition, lighting, and editing techniques for amazing photos.",
        date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "3:00 PM - 5:30 PM",
        startTime: "3:00 PM",
        endTime: "5:30 PM",
        location: "Art Building Studio B",
        category: "Workshops" as const,
        tags: ["Photography", "Creative", "Arts"],
        imageUrl: "https://images.unsplash.com/photo-1606933248051-5ce98adc1ecf?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 15,
        cancelled: false,
      },
      {
        title: "Public Speaking Masterclass",
        description: "Master the art of public speaking and presentation skills.",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "4:00 PM - 6:00 PM",
        startTime: "4:00 PM",
        endTime: "6:00 PM",
        location: "Communication Building Room 101",
        category: "Workshops" as const,
        tags: ["Speaking", "Presentation", "Communication"],
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300",
        requiresRegistration: false,
        cancelled: false,
      },
      // Competitions
      {
        title: "Code Golf Challenge",
        description: "Write the shortest code possible to solve programming challenges.",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "5:00 PM - 7:00 PM",
        startTime: "5:00 PM",
        endTime: "7:00 PM",
        location: "Computer Lab 202",
        category: "Competitions" as const,
        tags: ["Programming", "Challenge", "Competition"],
        imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 60,
        cancelled: false,
      },
      {
        title: "Science Fair",
        description: "Showcase student research projects and scientific innovations.",
        date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "10:00 AM - 4:00 PM",
        startTime: "10:00 AM",
        endTime: "4:00 PM",
        location: "Science Complex Main Hall",
        category: "Competitions" as const,
        tags: ["Science", "Research", "Innovation"],
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 150,
        cancelled: false,
      },
      {
        title: "Startup Pitch Night",
        description: "Student startups pitch their ideas to investors and mentors.",
        date: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "6:00 PM - 8:30 PM",
        startTime: "6:00 PM",
        endTime: "8:30 PM",
        location: "Entrepreneurship Hub",
        category: "Competitions" as const,
        tags: ["Startup", "Entrepreneurship", "Business"],
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300",
        requiresRegistration: true,
        maxParticipants: 80,
        cancelled: false,
      },
    ] as const satisfies readonly InsertEvent[];

    const eventIds: string[] = [];
    futureEvents.forEach((e) => {
      const id = randomUUID();
      eventIds.push(id);
      this.events.set(id, {
        ...e,
        id,
        currentParticipants: 0,
        cancelled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: adminId,
      });
    });

    // Add registrations and saved events for demo
    if (eventIds.length > 0 && demoUserIds.length > 0) {
      // Add registrations for first few users on various events
      demoUserIds.forEach((userId, userIndex) => {
        const eventsToRegister = eventIds.slice(userIndex * 3, userIndex * 3 + 3);
        eventsToRegister.forEach((eventId) => {
          if (!this.eventRegistrations.has(eventId)) {
            this.eventRegistrations.set(eventId, new Set());
          }
          this.eventRegistrations.get(eventId)!.add(userId);
          
          // Update event currentParticipants
          const event = this.events.get(eventId);
          if (event) {
            event.currentParticipants = (event.currentParticipants || 0) + 1;
            this.events.set(eventId, event);
          }
        });

        // Add saved events for users
        const eventsToSave = eventIds.slice((userIndex + 1) * 2, (userIndex + 1) * 2 + 4);
        eventsToSave.forEach((eventId) => {
          if (!this.savedEvents.has(userId)) {
            this.savedEvents.set(userId, new Set());
          }
          this.savedEvents.get(userId)!.add(eventId);
        });
      });
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser & { role?: "student" | "admin" }): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "student",
      joinedGroups: [],
      notificationPreferences: {
        eventRegistration: true,
        eventReminders24h: true,
        eventReminders1h: true,
      },
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllStudents(): Promise<Omit<User, "password">[]> {
    return Array.from(this.users.values()).map(({ password, ...user }) => user);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }

  async deleteGroup(id: string): Promise<boolean> {
    return this.groups.delete(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return Array.from(this.announcements.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    return this.announcements.get(id);
  }

  async createAnnouncement(
    announcement: InsertAnnouncement,
    userId: string,
    authorName: string
  ): Promise<Announcement> {
    const id = randomUUID();
    const newAnnouncement: Announcement = {
      ...announcement,
      id,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      authorName,
    };
    this.announcements.set(id, newAnnouncement);
    return newAnnouncement;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    return this.announcements.delete(id);
  }

  async getGroups(): Promise<Group[]> {
    return Array.from(this.groups.values()).sort((a, b) => b.memberCount - a.memberCount);
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async createGroup(group: InsertGroup, userId: string): Promise<Group> {
    const id = randomUUID();
    const newGroup: Group = {
      ...group,
      id,
      memberCount: 1,
      members: [userId],
      memberRoles: { [userId]: "creator" },
      createdBy: userId,
      createdAt: new Date().toISOString(),
      postsCount: 0,
      messagesCount: 0,
      pinnedMessages: [],
      lastActivityAt: new Date().toISOString(),
    };
    this.groups.set(id, newGroup);
    
    const user = await this.getUser(userId);
    if (user) {
      user.joinedGroups.push(id);
      this.users.set(userId, user);
    }
    
    return newGroup;
  }

  async getGroupMembers(groupId: string): Promise<Omit<User, "password">[]> {
    const group = this.groups.get(groupId);
    if (!group) return [];
    
    const members: Omit<User, "password">[] = [];
    for (const memberId of group.members) {
      const user = this.users.get(memberId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        members.push(userWithoutPassword);
      }
    }
    return members;
  }

  async joinGroup(groupId: string, userId: string): Promise<Group | undefined> {
    const group = this.groups.get(groupId);
    if (!group) return undefined;
    
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      group.memberCount = group.members.length;
      group.memberRoles[userId] = "member";
      this.groups.set(groupId, group);
      
      const user = await this.getUser(userId);
      if (user && !user.joinedGroups.includes(groupId)) {
        user.joinedGroups.push(groupId);
        this.users.set(userId, user);
      }
    }
    
    return group;
  }

  async leaveGroup(groupId: string, userId: string): Promise<Group | undefined> {
    const group = this.groups.get(groupId);
    if (!group) return undefined;
    
    group.members = group.members.filter((id) => id !== userId);
    group.memberCount = group.members.length;
    delete group.memberRoles[userId];
    this.groups.set(groupId, group);
    
    const user = await this.getUser(userId);
    if (user) {
      user.joinedGroups = user.joinedGroups.filter((id) => id !== groupId);
      this.users.set(userId, user);
    }
    
    return group;
  }

  async updateGroupRules(groupId: string, rules: string): Promise<Group | undefined> {
    const group = this.groups.get(groupId);
    if (!group) return undefined;
    
    group.rules = rules;
    this.groups.set(groupId, group);
    return group;
  }

  async setMemberRole(groupId: string, userId: string, role: "admin" | "moderator" | "member"): Promise<Group | undefined> {
    const group = this.groups.get(groupId);
    if (!group) return undefined;
    
    if (group.members.includes(userId)) {
      group.memberRoles[userId] = role;
      this.groups.set(groupId, group);
    }
    return group;
  }

  async getMemberRole(groupId: string, userId: string): Promise<string | undefined> {
    const group = this.groups.get(groupId);
    if (!group) return undefined;
    return group.memberRoles[userId];
  }

  async getGroupPosts(groupId: string, page: number = 1, limit: number = 10): Promise<{ posts: GroupPost[]; total: number; hasMore: boolean }> {
    const allPosts = Array.from(this.groupPosts.values())
      .filter((post) => post.groupId === groupId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const total = allPosts.length;
    const start = (page - 1) * limit;
    const posts = allPosts.slice(start, start + limit);
    
    return {
      posts,
      total,
      hasMore: start + limit < total,
    };
  }

  async getGroupPost(postId: string): Promise<GroupPost | undefined> {
    return this.groupPosts.get(postId);
  }

  async createGroupPost(
    post: InsertGroupPost,
    userId: string,
    authorName: string,
    authorAvatar?: string
  ): Promise<GroupPost> {
    const id = randomUUID();
    const newPost: GroupPost = {
      ...post,
      id,
      authorId: userId,
      authorName,
      authorAvatar,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
    };
    this.groupPosts.set(id, newPost);

    const group = this.groups.get(post.groupId);
    if (group) {
      group.postsCount = (group.postsCount || 0) + 1;
      group.lastActivityAt = new Date().toISOString();
      this.groups.set(post.groupId, group);
    }

    return newPost;
  }

  async deleteGroupPost(postId: string): Promise<boolean> {
    const post = this.groupPosts.get(postId);
    if (!post) return false;
    
    const deleted = this.groupPosts.delete(postId);
    
    if (deleted) {
      const group = this.groups.get(post.groupId);
      if (group) {
        group.postsCount = Math.max(0, (group.postsCount || 1) - 1);
        this.groups.set(post.groupId, group);
      }
    }
    
    return deleted;
  }

  async likeGroupPost(postId: string, userId: string): Promise<GroupPost | undefined> {
    const post = this.groupPosts.get(postId);
    if (!post) return undefined;
    
    const likedIndex = post.likedBy.indexOf(userId);
    if (likedIndex === -1) {
      post.likedBy.push(userId);
      post.likes = post.likedBy.length;
    } else {
      post.likedBy.splice(likedIndex, 1);
      post.likes = post.likedBy.length;
    }
    
    this.groupPosts.set(postId, post);
    return post;
  }

  async searchGroupPosts(groupId: string, query: string): Promise<GroupPost[]> {
    const searchLower = query.toLowerCase();
    return Array.from(this.groupPosts.values())
      .filter((post) => 
        post.groupId === groupId &&
        (post.content.toLowerCase().includes(searchLower) ||
         post.authorName.toLowerCase().includes(searchLower))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getMessages(groupId: string, page: number = 1, limit: number = 50): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    const allMessages = Array.from(this.messages.values())
      .filter((msg) => msg.groupId === groupId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const total = allMessages.length;
    const start = Math.max(0, total - page * limit);
    const end = Math.max(0, total - (page - 1) * limit);
    const messages = allMessages.slice(start, end);
    
    return {
      messages,
      total,
      hasMore: start > 0,
    };
  }

  async getMessage(messageId: string): Promise<Message | undefined> {
    return this.messages.get(messageId);
  }

  async createMessage(
    message: InsertMessage,
    userId: string,
    authorName: string,
    authorAvatar?: string
  ): Promise<Message> {
    const id = randomUUID();
    const newMessage: Message = {
      ...message,
      id,
      authorId: userId,
      authorName,
      authorAvatar,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      reactions: {},
      isPinned: false,
    };
    this.messages.set(id, newMessage);

    const group = this.groups.get(message.groupId);
    if (group) {
      group.messagesCount = (group.messagesCount || 0) + 1;
      group.lastActivityAt = new Date().toISOString();
      this.groups.set(message.groupId, group);
    }

    return newMessage;
  }

  async editMessage(messageId: string, content: string): Promise<Message | undefined> {
    const message = this.messages.get(messageId);
    if (!message) return undefined;
    
    message.content = content;
    message.editedAt = new Date().toISOString();
    this.messages.set(messageId, message);
    return message;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const message = this.messages.get(messageId);
    if (!message) return false;
    
    const deleted = this.messages.delete(messageId);
    
    if (deleted) {
      const group = this.groups.get(message.groupId);
      if (group) {
        group.messagesCount = Math.max(0, (group.messagesCount || 1) - 1);
        group.pinnedMessages = group.pinnedMessages.filter(id => id !== messageId);
        this.groups.set(message.groupId, group);
      }
    }
    
    return deleted;
  }

  async likeMessage(messageId: string, userId: string): Promise<Message | undefined> {
    const message = this.messages.get(messageId);
    if (!message) return undefined;
    
    const likedIndex = message.likedBy.indexOf(userId);
    if (likedIndex === -1) {
      message.likedBy.push(userId);
      message.likes = message.likedBy.length;
    } else {
      message.likedBy.splice(likedIndex, 1);
      message.likes = message.likedBy.length;
    }
    
    this.messages.set(messageId, message);
    return message;
  }

  async addReaction(messageId: string, emoji: string, userId: string): Promise<Message | undefined> {
    const message = this.messages.get(messageId);
    if (!message) return undefined;
    
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }
    
    const userIndex = message.reactions[emoji].indexOf(userId);
    if (userIndex === -1) {
      message.reactions[emoji].push(userId);
    } else {
      message.reactions[emoji].splice(userIndex, 1);
      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji];
      }
    }
    
    this.messages.set(messageId, message);
    return message;
  }

  async pinMessage(messageId: string): Promise<Message | undefined> {
    const message = this.messages.get(messageId);
    if (!message) return undefined;
    
    message.isPinned = true;
    this.messages.set(messageId, message);
    
    const group = this.groups.get(message.groupId);
    if (group && !group.pinnedMessages.includes(messageId)) {
      group.pinnedMessages.push(messageId);
      this.groups.set(message.groupId, group);
    }
    
    return message;
  }

  async unpinMessage(messageId: string): Promise<Message | undefined> {
    const message = this.messages.get(messageId);
    if (!message) return undefined;
    
    message.isPinned = false;
    this.messages.set(messageId, message);
    
    const group = this.groups.get(message.groupId);
    if (group) {
      group.pinnedMessages = group.pinnedMessages.filter(id => id !== messageId);
      this.groups.set(message.groupId, group);
    }
    
    return message;
  }

  async searchMessages(groupId: string, query: string): Promise<Message[]> {
    const searchLower = query.toLowerCase();
    return Array.from(this.messages.values())
      .filter((msg) => 
        msg.groupId === groupId &&
        (msg.content.toLowerCase().includes(searchLower) ||
         msg.authorName.toLowerCase().includes(searchLower))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(event: InsertEvent, userId: string): Promise<Event> {
    const id = randomUUID();
    const newEvent: Event = {
      ...event,
      id,
      currentParticipants: 0,
      cancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    this.eventRegistrations.delete(id);
    this.savedEvents.delete(id);
    return this.events.delete(id);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    const updatedEvent = { ...event, ...updates, updatedAt: new Date().toISOString() };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async registerForEvent(eventId: string, userId: string): Promise<Event | undefined> {
    const event = this.events.get(eventId);
    if (!event) return undefined;
    if (event.cancelled) return undefined;
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) return undefined;
    
    if (!this.eventRegistrations.has(eventId)) {
      this.eventRegistrations.set(eventId, new Set());
    }
    const registrations = this.eventRegistrations.get(eventId)!;
    if (!registrations.has(userId)) {
      registrations.add(userId);
      event.currentParticipants = registrations.size;
      this.events.set(eventId, event);
    }
    return event;
  }

  async unregisterFromEvent(eventId: string, userId: string): Promise<Event | undefined> {
    const event = this.events.get(eventId);
    if (!event) return undefined;
    const registrations = this.eventRegistrations.get(eventId);
    if (registrations && registrations.has(userId)) {
      registrations.delete(userId);
      event.currentParticipants = registrations.size;
      this.events.set(eventId, event);
    }
    return event;
  }

  async saveEvent(eventId: string, userId: string): Promise<boolean> {
    if (!this.savedEvents.has(userId)) {
      this.savedEvents.set(userId, new Set());
    }
    this.savedEvents.get(userId)!.add(eventId);
    return true;
  }

  async unsaveEvent(eventId: string, userId: string): Promise<boolean> {
    const userSaved = this.savedEvents.get(userId);
    if (userSaved) {
      return userSaved.delete(eventId);
    }
    return false;
  }

  async getSavedEvents(userId: string): Promise<Event[]> {
    const userSaved = this.savedEvents.get(userId);
    if (!userSaved) return [];
    return Array.from(userSaved)
      .map(id => this.events.get(id))
      .filter((e): e is Event => e !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(e => e.category === category)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getUpcomingEvents(days: number = 30): Promise<Event[]> {
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return Array.from(this.events.values())
      .filter(e => !e.cancelled && new Date(e.date) >= now && new Date(e.date) <= limit)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getRecommendedEvents(userId: string): Promise<Event[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    const allEvents = Array.from(this.events.values())
      .filter(e => !e.cancelled && new Date(e.date) >= new Date());

    const scored = allEvents.map(event => {
      let score = 0;

      // Match by saved tags (10 points per tag)
      const userSavedTags = this.getSavedEventTags(userId);
      if (event.tags) {
        const tagMatches = event.tags.filter(tag => userSavedTags.includes(tag));
        score += tagMatches.length * 10;
      }

      // Match by past registration category (15 points)
      const userRegistrations = this.eventRegistrations.get(userId);
      if (userRegistrations && userRegistrations.size > 0) {
        const pastEvents = Array.from(userRegistrations)
          .map(id => this.events.get(id))
          .filter((e): e is Event => e !== undefined);
        
        if (event.category && pastEvents.some(e => e.category === event.category)) {
          score += 15;
        }
      }

      // Boost for popular categories (5 points)
      if (event.category && ['Academic', 'Workshops'].includes(event.category)) {
        score += 5;
      }

      return { event, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score || new Date(a.event.date).getTime() - new Date(b.event.date).getTime())
      .slice(0, 6)
      .map(s => s.event);
  }

  private getSavedEventTags(userId: string): string[] {
    const userRegistrations = this.eventRegistrations.get(userId);
    if (!userRegistrations) return [];
    
    const tags = new Set<string>();
    for (const eventId of userRegistrations) {
      const event = this.events.get(eventId);
      if (event?.tags) {
        event.tags.forEach(tag => tags.add(tag));
      }
    }
    return Array.from(tags);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async markNotificationRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifications.set(id, notification);
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId) {
        notification.read = true;
        this.notifications.set(id, notification);
      }
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const upcomingEvents = Array.from(this.events.values()).filter(
      (e) => new Date(e.date) >= now
    ).length;

    return {
      totalAnnouncements: this.announcements.size,
      totalGroups: this.groups.size,
      upcomingEvents,
      unreadNotifications: 0,
    };
  }

  private scheduleEventReminders() {
    setInterval(() => {
      const now = new Date();
      for (const event of this.events.values()) {
        const eventDate = new Date(event.date);
        
        // Calculate time differences
        const timeDiff = eventDate.getTime() - now.getTime();
        const hoursUntil = timeDiff / (1000 * 60 * 60);
        
        // Check for 24-hour reminder
        if (hoursUntil > 23.9 && hoursUntil < 24.1) {
          this.sendReminderNotifications(event, "24h");
        }
        
        // Check for 1-hour reminder
        if (hoursUntil > 0.9 && hoursUntil < 1.1) {
          this.sendReminderNotifications(event, "1h");
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private sendReminderNotifications(event: Event, type: "24h" | "1h") {
    const registrations = this.eventRegistrations.get(event.id);
    if (!registrations) return;

    registrations.forEach((userId) => {
      const reminderKey = `${event.id}-${userId}-${type}`;
      
      // Check if reminder already sent (prevent duplicates)
      if (this.sentReminders.has(reminderKey)) return;
      
      const user = this.users.get(userId);
      if (!user) return;

      // Check user notification preference
      const prefKey = type === "24h" ? "eventReminders24h" : "eventReminders1h";
      if (!user.notificationPreferences[prefKey as keyof typeof user.notificationPreferences]) return;

      // Create and store reminder notification
      const reminderMessage = type === "24h" 
        ? `${event.title} starts in 24 hours at ${event.location}`
        : `${event.title} starts in 1 hour at ${event.location}`;

      const notificationId = randomUUID();
      this.notifications.set(notificationId, {
        id: notificationId,
        userId,
        title: `Reminder: ${event.title}`,
        message: reminderMessage,
        type: "reminder",
        read: false,
        createdAt: new Date().toISOString(),
        link: `/events/${event.id}`,
        eventId: event.id,
        reminderType: type,
      });

      // Mark as sent to prevent duplicates
      this.sentReminders.add(reminderKey);
    });
  }
}

export const storage = new MemStorage();
