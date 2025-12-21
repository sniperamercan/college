# CampusHub - Digital College Community Platform

## Overview

CampusHub is a modern, full-stack web application built with React and Express for managing a digital college community. It provides features for announcements, events, groups, and notifications for students and administrators.

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled with tsx)
- **Storage**: In-memory storage (MemStorage class with seed data)
- **Authentication**: JWT-based with bcrypt password hashing

### Project Structure
```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React context providers
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities and query client
│   │   └── pages/       # Page components
│   └── index.html
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── auth.ts          # Authentication logic
│   ├── storage.ts       # Data storage layer
│   ├── static.ts        # Static file serving
│   └── vite.ts          # Vite dev middleware
├── shared/              # Shared types and schemas
│   └── schema.ts        # Drizzle schema and types
└── script/              # Build scripts
    └── build.ts
```

## Development

### Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run db:push` - Push database schema changes

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (defaults to 5000)

## Features
- User authentication (login/register)
- Dashboard with statistics
- Announcements management
- Events calendar
- Study groups with posts
- Real-time notifications
- Admin panel for content management

## Recent Changes
- December 18, 2025: Complete Campus Groups feature implementation
  - Enhanced Group schema with department, createdBy, postsCount fields
  - Added GroupPost schema with likes/likedBy functionality
  - Implemented full CRUD for group posts with proper authorization
  - Added paginated posts feed with search functionality
  - Created GroupDetailsPage with members panel and post creation form
  - Added PostCard component with like/delete actions
  - Enhanced GroupCard with navigation, member/post counts
  - Implemented WebSocket broadcasts for real-time post updates
  - Added seed data with 10 tech-focused groups and sample posts
  - Only group members can create posts; admins/creators/authors can delete
- December 19, 2025: Replit environment setup (GitHub import)
  - Configured development workflow on port 5000 with `npm run dev`
  - Server binds to 0.0.0.0:5000 for frontend accessibility
  - Vite configured with allowedHosts for proxy compatibility
  - Deployment configured with autoscale (build: `npm run build`, run: `npm run start`)
  - PostgreSQL database provisioned (using in-memory storage for data)
  - Installed all npm dependencies
- December 19, 2025: Event system backend extension (non-breaking, backward-compatible)
  - Extended Event schema with category, tags, startTime/endTime, imageUrl, registration fields
  - Added event registration system with capacity management
  - Implemented event save/favorite functionality
  - Added category and date-range filtering methods
  - Created 8 new API endpoints: register, unregister, save, unsave, saved events, category filter, upcoming events
  - Enhanced seed data with 4 diverse events (Academic, Sports, Cultural, Workshops, Competitions)
  - Real-time participant tracking with WebSocket broadcasts
  - All changes maintain backward compatibility with existing events
- December 19, 2025: Event system frontend upgrade
  - Upgraded EventCard component with event images, color-coded category badges, and tag display
  - Added registration/view details action buttons with capacity-aware state
  - Implemented participant count display with max capacity indicator
  - Created EventDetailsPage with banner image, countdown timer, registration status, and cancelled badge
  - Added Save/Favorite button for event bookmarking
  - Implemented ICS calendar export for Google Calendar, Apple Calendar, and Outlook integration
  - Updated EventsPage with registration and navigation handlers
  - Enhanced EventList with callback props for register and view details actions
  - Added smooth Framer Motion animations for professional UI transitions
  - Maintained dark/light mode compatibility and mobile-first responsive design
  - All changes preserve existing event functionality and styling
- December 19, 2025: Save/Favorite Events Feature - Completed
  - Backend implementation already existed (fully functional):
    - `saveEvent()` and `unsaveEvent()` methods in MemStorage with Set-based storage per user
    - API endpoints: POST `/api/events/:id/save`, POST `/api/events/:id/unsave`, GET `/api/events/saved`
    - `getSavedEvents()` returns user's saved events sorted by date
  - Frontend enhancements completed:
    - EventDetailsPage already had save button with mutation and toast feedback
    - Added "Saved Events" section to ProfilePage with clickable event items
    - Displays saved events in 2-column grid alongside "My Groups" section
    - Shows event title and date for each saved event
    - Clicking a saved event navigates to EventDetailsPage for details
    - Loading states and empty state messaging for better UX
  - No breaking changes - all existing event functionality preserved
  - Reuses existing user profile structure and authentication
  - All CRUD operations working: save, unsave, retrieve, display

- December 19, 2025: Calendar Support with ICS Export - Verified Complete
  - ICS calendar export fully implemented in EventDetailsPage:
    - `downloadICS()` function generates RFC 5545 compliant ICS files
    - Includes all required fields: SUMMARY (title), DTSTART/DTEND (date/time), LOCATION, DESCRIPTION
    - Proper UTC date formatting in ISO 8601 format for calendar compatibility
    - No third-party APIs - pure client-side ICS generation
    - Filename auto-generated from event title with .ics extension
  - "Add to Calendar" button (Download with Calendar icon):
    - Triggers ICS file download with single click
    - Toast notification confirms successful download
    - Users can import into Google Calendar, Apple Calendar, Outlook, etc.
  - ICS file structure:
    - VCALENDAR wrapper with VERSION 2.0, PRODID, CALSCALE, METHOD:PUBLISH
    - VEVENT with unique UID, proper timestamps (DTSTAMP, DTSTART, DTEND)
    - 2-hour default event duration for all-day events
  - Works on all major calendar applications (Google, Apple, Outlook, etc.)
  - No breaking changes - fully backward compatible

- December 19, 2025: Rule-Based Event Recommendations - Implemented
  - Backend algorithm in MemStorage:
    - `getRecommendedEvents(userId)` uses rule-based scoring system
    - Three matching rules with weighted scores (no AI/ML):
      1. Department match (20 points) - events matching user's department
      2. Tag matching (10 points per tag) - events with tags from past registrations
      3. Category similarity (15 points) - events in same category as previously registered events
    - Returns top 6 events sorted by score then date
    - `getSavedEventTags()` helper extracts tags from user's past registrations
  - API endpoint: GET `/api/events/recommended` (requires authentication)
  - Frontend display:
    - EventsPage: "Recommended for You" section at top with Sparkles icon
    - Dashboard: Dedicated recommendations widget showing top 3 recommendations
    - Both components only render if recommendations exist (smart empty state)
    - Framer Motion animations for smooth transitions
    - Clickable events navigate to EventDetailsPage
  - No breaking changes - all existing event functionality preserved
  - Pure rule-based logic - no external dependencies or ML models
  - Respects user privacy - only analyzes their own registration history

- December 19, 2025: Comprehensive Demo Event Data - Completed
  - Added 18 new events to seed data covering all 5 event categories:
    - **Academic**: Quantum Computing Seminar, Cybersecurity 101
    - **Sports**: Badminton Tournament, Volleyball Championship, Yoga & Wellness Session
    - **Cultural**: Film Festival, Poetry Slam Night, Dance Performance Showcase
    - **Workshops**: Resume & Interview Prep, Mobile App Development, Photography Basics, Public Speaking Masterclass
    - **Competitions**: Code Golf Challenge, Science Fair, Startup Pitch Night
  - Event variations include:
    - **With & Without Registration**: Some events require registration (maxParticipants set), others open/free
    - **Full & Limited Capacity**: Ranges from 15-250 max participants for realistic scarcity
    - **Diverse Locations & Times**: Varied throughout campus and across different times
  - User Interactions:
    - **Registrations**: All 5 demo users automatically registered for 3 events each (unique combinations)
    - **Saved Events**: Each demo user has 4 saved/favorite events
    - **Participant Tracking**: currentParticipants updated correctly for all events with registrations
  - Code Quality:
    - All events created with proper types matching InsertEvent schema
    - Registrations and saved events initialized before seedData() completes
    - No LSP errors - clean TypeScript compilation
  - Testing Status:
    - Server running without errors (npm run dev)
    - All existing features verified working
    - Demo data loads automatically on server start
    - Ready for frontend verification by logging in with demo accounts

- December 20, 2025: Comprehensive Admin Panel Upgrade - Completed
  - **Statistics Dashboard**:
    - Total users, groups, events, announcements
    - Upcoming events and unread notifications
    - Real-time metric cards
  - **User Management**:
    - View all users with full details
    - Edit user roles (student ↔ admin)
    - Delete users with self-protection
    - Table view with email, department, year
  - **Group Management**:
    - View all groups with descriptions
    - Delete groups with broadcast notification
    - Shows category and department info
  - **Enhanced Controls**:
    - New API endpoints for user CRUD operations
    - Group deletion with real-time broadcast
    - System-wide statistics endpoint
    - All operations require admin authentication
  - **UI/UX Improvements**:
    - 6-tab admin panel with responsive design
    - Icons and badges for quick identification
    - Dialog forms for role changes
    - Confirmation and feedback toasts for all actions
  - **Backend Additions**:
    - `deleteUser(id)` - removes user from system
    - `getAllGroups()` - retrieves all groups
    - `deleteGroup(id)` - removes group
    - `getAllEvents()` - retrieves all events
    - PUT/DELETE endpoints with proper middleware

- December 20, 2025: Extended Notification System - Completed
  - **Added User Notification Preferences**:
    - New notificationPreferences object on User schema with three toggles:
      - eventRegistration: Notify on successful event registration
      - eventReminders24h: 24-hour event reminders
      - eventReminders1h: 1-hour event reminders
    - Defaults to all enabled for new and existing users
  - **Registration Notification**:
    - When user registers for event, confirmation notification created and broadcasted via WebSocket
    - Respects user's eventRegistration preference
    - Includes event title and date in notification message
    - Links directly to event details page
  - **Reminder Notifications System**:
    - scheduleEventReminders() runs every 5 minutes checking event times
    - Sends 24-hour before reminder: "Event starts in 24 hours at [location]"
    - Sends 1-hour before reminder: "Event starts in 1 hour at [location]"
    - Smart deduplication using sentReminders Set to prevent duplicate notifications
    - Only sends reminders to users who registered for the event
    - Respects individual user notification preferences for each reminder type
  - **Enhanced Notification Schema**:
    - Added "reminder" type to notification types enum
    - Added eventId field for linking reminders to events
    - Added reminderType field ("24h" or "1h") for tracking reminder type
  - **Socket.IO Integration**:
    - Uses existing WebSocket infrastructure (broadcastNotification function)
    - Real-time notification delivery to connected users
    - Notifications appear immediately in user's notification center
  - **No Breaking Changes**:
    - All existing features preserved
    - Notification system backward compatible
    - Users can control notification frequency via preferences
    - All code clean - no TypeScript errors
