# AI Agent Console

Build a Production-Quality AI Agent SaaS Platform — Frontend Only

1. PROJECT GOAL

Build a complete, polished, production-quality frontend for a modern AI Agent SaaS platform.

The platform allows businesses and developers to:

Create AI voice agents

Create AI chat agents

Configure agent personalities and behavior

Manage AI agent templates

Manage phone numbers

Make and monitor calls

View call history

View recordings and transcripts

Manage appointments

Manage products/catalog

Manage orders

Configure webhooks

Generate/manage developer API keys

View API usage

Manage credits and usage

Manage team members

Configure account settings

The reference material describes the required product capabilities, but DO NOT copy its visual design.

Create a completely original UI/UX and visual identity.

The final result should feel like a premium modern AI infrastructure/productivity platform comparable in polish to Linear, Vercel, Stripe, Raycast, and modern AI developer tools — but do NOT directly copy any of their designs.

2. VERY IMPORTANT DESIGN DIRECTION

Do NOT reproduce the reference website's UI.

Do NOT create a generic admin dashboard.

Do NOT make every page look like a simple CRUD table.

Do NOT use excessive purple gradients everywhere.

Do NOT use giant unnecessary cards.

Do NOT use glassmorphism excessively.

Do NOT make the application look like a template generated from a dashboard UI kit.

Instead, create a distinctive product identity.

The application should feel like:

"An intelligent control center for AI agents."

The UI should communicate:

Intelligence

Automation

Reliability

Developer tooling

Business operations

Real-time activity

Premium SaaS quality

3. BRAND

Use the temporary product name:

SAKETH AI

Logo:

Minimal abstract AI/spark/orbit symbol

Modern

Geometric

Simple enough to work as a favicon

Do not use a robot head icon

Do not use a generic ChatGPT-like logo

Brand style:

Dark graphite

Soft white

Neutral gray

One distinctive electric accent

Subtle gradients only where useful

Use CSS variables for all colors so the theme can easily be changed later.

4. VISUAL STYLE

Primary visual language:

Dark-first interface

Graphite background rather than pure black

High-quality typography

Strong spacing system

Thin borders

Soft shadows

Subtle depth

Small radius on most components

Larger radius for major containers

Clean data visualization

Minimal iconography

Excellent empty states

Smooth transitions

Avoid:

Rainbow gradients

Excessive neon

Excessive glowing borders

Huge rounded cards everywhere

Cartoon illustrations

Generic SaaS stock imagery

Excessive animations

The application should feel serious enough for business users and developers.

5. RESPONSIVENESS

The entire application MUST be responsive.

Desktop:

Primary experience

Sidebar navigation

Multi-column layouts

Dense information architecture

Tablet:

Collapsible sidebar

Adaptive grids

Responsive tables

Mobile:

Bottom navigation or compact navigation

Slide-out sidebar

Cards instead of wide tables

Horizontally scrollable data where appropriate

Full-screen dialogs where appropriate

Do not simply shrink the desktop layout.

Actually redesign layouts for mobile.

6. TECH STACK

Use:

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

Lucide React icons

React Router

TanStack Query

Recharts

Use reusable components.

Do not put large amounts of duplicated JSX into individual pages.

Create a proper component architecture.

7. FRONTEND ARCHITECTURE

Use a clean structure similar to:

src/

├── components/
│ ├── ui/
│ ├── layout/
│ ├── navigation/
│ ├── charts/
│ ├── agents/
│ ├── calls/
│ ├── appointments/
│ ├── catalog/
│ ├── orders/
│ ├── developer/
│ └── shared/
│
├── pages/
│ ├── dashboard/
│ ├── agents/
│ ├── templates/
│ ├── phone-numbers/
│ ├── calls/
│ ├── recordings/
│ ├── appointments/
│ ├── catalog/
│ ├── orders/
│ ├── webhooks/
│ ├── developer/
│ ├── usage/
│ ├── team/
│ └── settings/
│
├── layouts/
├── hooks/
├── services/
├── mock/
├── types/
├── lib/
└── routes/

Keep business logic separate from presentation.

8. IMPORTANT BACKEND RULE

This is a FRONTEND-FIRST implementation.

Do not build a fake backend.

Do not connect directly to a database.

Do not use localStorage as the actual application database.

Instead create a service abstraction:

UI
↓
React hooks
↓
service/API layer
↓
mock implementation for now

Later we will replace:

mock API

with:

Node.js + Express API

without rewriting the UI.

Create realistic mock services and mock data.

9. APPLICATION SHELL

Create the main application shell.

Desktop:

Left sidebar
+
Top navigation
+
Main content area

Sidebar should have:

OVERVIEW

Dashboard

BUILD

Agents
Templates

OPERATE

Phone Numbers
Calls
Recordings

BUSINESS

Appointments
Catalog
Orders

DEVELOP

Webhooks
Developer API

INSIGHTS

Usage & Credits
Analytics

WORKSPACE

Team
Settings

At the bottom:

Workspace selector

User avatar

User name

Email

Settings

Logout

10. TOP BAR

Create a minimal top bar.

Left:

Page title

Breadcrumb where useful

Center:

Global search

Right:

Command/search shortcut indicator

Notifications

Help

User avatar

Search should visually feel like a command palette trigger.

Keyboard shortcut:

CMD/CTRL + K

Create a command palette UI with:

Search pages

Search agents

Search calls

Create agent

Create appointment

Create order

Open settings

11. WORKSPACE SELECTOR

Create a polished workspace selector.

Example:

SAKETH AI
Workspace: Acme Labs

Dropdown:

Acme Labs

Personal Workspace

Demo Workspace

Create Workspace

The workspace selector should visually communicate that this is a multi-tenant SaaS platform.

12. DASHBOARD

Create a premium dashboard.

Header:

"Good evening"

Subtitle:

"Here's what is happening across your AI operations."

Top right:

Date range selector

Refresh button

Primary metrics:

Active Agents

12

Show:

+2 this month

Calls

248

Show:

+18.4%

Call Minutes

1,842

Show:

+12.7%

Credits

₹83.40

Show:

16 minutes remaining

Then create:

AI ACTIVITY

A real-time activity stream.

Examples:

Agent "Receptionist AI" completed a call

Order #1048 created

Appointment scheduled

Agent "Sales Assistant" went live

Webhook delivered

Call recording processed

Use timestamps:

2 min ago
8 min ago
14 min ago

13. ANALYTICS SECTION

Create a large analytics panel.

Title:

"AI Operations"

Tabs:

Calls

Minutes

Agents

Credits

Create a polished Recharts visualization.

Allow:

7D
30D
90D

Chart should look professional and minimal.

14. QUICK ACTIONS

Create a section:

"Quick actions"

Buttons:

Create Agent

Test Voice Agent

Buy Phone Number

Create Appointment

Add Product

Create API Key

These should be visually compact and useful.

15. AGENTS PAGE

This is one of the most important pages.

Create a premium agent management experience.

Header:

Agents

Subtitle:

"Build, configure and deploy intelligent agents."

Buttons:

Create Agent

Import Agent

Filters:

All
Voice
Chat
Draft
Active
Paused

Agent cards should show:

Agent avatar/icon

Agent name

Type

Status

Model

Number of calls

Last activity

Assigned phone number

Actions

Example:

Receptionist AI
Voice Agent
● Active

248 calls
+91 Demo Number

Last active 4 min ago

16. AGENT DETAIL PAGE

Do NOT make this a boring form.

Make it feel like an AI control room.

Header:

Agent name

Status:

● Live

Actions:

Test Agent
Duplicate
Pause
Settings

Main layout:

Left:

Agent configuration

Center:

Live preview / conversation simulator

Right:

Agent status and tools

Tabs:

Overview
Behavior
Knowledge
Tools
Voice
Analytics
Activity

17. AGENT CREATION FLOW

Create a multi-step creation wizard.

Step 1:

Choose agent type

Voice Agent
Chat Agent

Step 2:

Choose template

Examples:

Receptionist

Sales Assistant

Customer Support

Appointment Scheduler

Restaurant Assistant

Medical Receptionist

Real Estate Assistant

Legal Receptionist

Personal Assistant

Step 3:

Basic configuration

Name

Description

Step 4:

Behavior

System instructions

Personality

Tone

Greeting

Fallback behavior

Step 5:

Tools

Appointments
Catalog
Orders
Knowledge
Human transfer

Step 6:

Voice configuration for voice agents

Voice
Language
Speed
Pitch

Step 7:

Review

Step 8:

Deploy

Make the wizard visually polished.

18. AGENT BUILDER

The behavior editor should be a major visual feature.

Create:

System instructions editor

Example:

"You are the virtual receptionist for Acme Labs..."

Add:

Character count

Variables

Prompt templates

Reset

Save

Create a live preview panel.

Example conversation:

User:

"Hi, I need to schedule an appointment."

Agent:

"Absolutely. What day works best for you?"

Make the conversation animate subtly.

19. TOOLS UI

Create a visual tool management page.

Available tools:

Calendar
Appointments
Catalog
Orders
Knowledge
Web Search
Human Transfer
Custom API

Each tool has:

Icon

Name

Description

Enabled toggle

Configuration

Example:

Calendar

"Allow the agent to check availability and schedule appointments."

[Enabled]

20. TEMPLATES PAGE

Create a beautiful template marketplace.

Categories:

Healthcare
Legal
Real Estate
Restaurant
Retail
Home Services
Finance
General

Template cards:

Icon

Template name

Description

Use case

Voice/Chat badge

Use Template button

Examples:

Law Firm Receptionist

Dental Receptionist

Restaurant Ordering Agent

Real Estate Assistant

HVAC Booking Agent

Customer Support Agent

Sales Qualification Agent

21. PHONE NUMBERS

Create:

Phone Numbers

Top section:

Available numbers
Assigned numbers
Unassigned numbers

Number card:

+91 XXX XXX XXXX

India

Assigned to:

Receptionist AI

Status:

● Active

Actions:

Configure
Reassign
Release

Also create:

"Get a number"

dialog.

Use mock numbers.

Clearly indicate these are demo numbers for now.

22. CALLS PAGE

Create a professional call operations screen.

Top metrics:

Total Calls

Answered

Missed

Average Duration

Total Minutes

Main table:

Customer
Agent
Direction
Duration
Status
Date
Actions

Direction:

Inbound
Outbound

Statuses:

Completed
In Progress
Failed
Missed
Voicemail

Add filters:

Date
Agent
Status
Direction

Search calls.

23. CALL DETAIL PAGE

This page should feel premium.

Header:

Call #10284

Status:

Completed

Customer:

John Doe

Agent:

Receptionist AI

Duration:

04:32

Then:

Conversation

Create a transcript UI.

Customer:

"Hi, I'd like to schedule an appointment."

Agent:

"Sure. What day would you prefer?"

Make speakers visually distinct.

Then:

Call Information

Duration
Start time
End time
Phone number
Agent
Direction
Cost

AI Analysis

Intent:

Appointment booking

Sentiment:

Positive

Outcome:

Appointment scheduled

24. RECORDINGS

Create a recording library.

Each recording:

Agent
Customer
Duration
Date
Status

Audio player:

Play
Pause
Timeline
Volume
Playback speed

Below:

Transcript

AI Summary

Sentiment

25. APPOINTMENTS

Create a modern scheduling interface.

Views:

Month
Week
Day
List

Calendar events should have:

Customer

Agent

Appointment type

Time

Status

Create appointment modal.

Fields:

Customer
Phone
Email
Agent
Date
Time
Duration
Notes

26. CATALOG

Create product management.

Header:

Catalog

Buttons:

Add Product

Add Category

Product cards/table:

Product
SKU
Category
Price
Stock
Status
Actions

Product detail:

Name
Description
Price
SKU
Category
Availability
Agent visibility

27. ORDERS

Create order management.

Metrics:

Orders
Revenue
Pending
Completed

Tabs:

All
Pending
Processing
Completed
Cancelled

Order detail drawer/page:

Order ID

Customer

Items

Quantity

Price

Total

Status

Created

AI Agent

Timeline

28. WEBHOOKS

Create a developer-focused webhook interface.

Header:

Webhooks

Description:

"Connect AI events to your systems."

Button:

Add Endpoint

Endpoint card:

https://example.com/webhooks

Status:

● Healthy

Events:

Call Completed
Order Created
Appointment Created

Actions:

Edit
Test
Disable
Delete

Create an event delivery history panel.

Show:

200 Delivered

500 Failed

Retrying

29. DEVELOPER API

Make this feel like a serious developer product.

Navigation:

Overview
API Keys
Documentation
Usage

API key page:

Create API Key

Warning:

"Your secret key will only be shown once."

Display:

sk_live_••••••••••••

Actions:

Copy
Revoke

Permission levels:

Read Only

Full Access

30. API DOCUMENTATION

Create a documentation interface.

Left navigation:

Introduction
Authentication
Agents
Calls
Appointments
Orders
Catalog
Webhooks
Errors

Main area:

Endpoint

POST /v1/calls

Description

Request

Response

Code examples:

curl
JavaScript
Python

Use syntax-highlighted code blocks.

This is frontend documentation only for now.

31. USAGE & CREDITS

Create a beautiful usage dashboard.

Top:

Current Balance

₹83.40

Estimated remaining:

16 minutes

Usage:

Today
This Week
This Month

Charts:

Call minutes
AI usage
Credits

Transaction history:

Date
Description
Usage
Balance

Example:

Voice call
-₹2.40

Agent test
-₹0.20

Credit added
+₹50

32. TEAM PAGE

Create team management.

Members:

Name
Email
Role
Status
Last active

Roles:

Owner
Admin
Member
Viewer

Button:

Invite Member

Invitation modal.

33. SETTINGS

Create a proper settings application.

Sections:

General

Workspace

Profile

Security

Notifications

AI Defaults

Voice Defaults

Billing

API

Danger Zone

Use a settings sidebar rather than putting everything on one huge page.

34. NOTIFICATIONS

Create a notification center.

Types:

Agent deployed

Call completed

Webhook failed

Low credits

Appointment scheduled

Order created

Use:

Unread indicator

Mark all as read

Notification grouping

35. EMPTY STATES

Every major page must have a beautiful empty state.

Example:

Agents empty state:

"Your first AI agent is waiting."

Subtitle:

"Create an agent to automate conversations, calls and business workflows."

Button:

Create Agent

Do not leave empty tables.

36. LOADING STATES

Use skeleton loaders.

Do not use generic spinning loaders everywhere.

Create:

Dashboard skeleton

Agent card skeleton

Table skeleton

Call detail skeleton

Calendar skeleton

37. ERROR STATES

Create polished error states.

Examples:

Something went wrong.

Unable to load agents.

Try again

Also include:

Network error

Permission denied

Not found

API unavailable

38. MODALS AND DRAWERS

Use dialogs/drawers strategically.

Examples:

Create Agent
Create Appointment
Add Product
Create API Key
Buy Phone Number
Invite Member
Delete Agent
Release Number

Dangerous actions must require confirmation.

39. MICRO-INTERACTIONS

Use Framer Motion or lightweight CSS animations.

Examples:

Page transitions

Sidebar transitions

Card hover

Button feedback

Modal entrance

Toast notifications

Agent status changes

Live activity

Chart animations

Command palette

Dropdowns

Keep animations subtle.

Do not animate everything.

40. TOAST SYSTEM

Create useful toast notifications.

Examples:

"Agent created successfully."

"Agent deployed."

"API key copied."

"Webhook test delivered."

"Product updated."

"Appointment created."

41. COMMAND PALETTE

Make CMD/CTRL + K open a command palette.

Commands:

Go to Dashboard

Go to Agents

Create Agent

Create Appointment

Create Order

Add Product

View Calls

View API Keys

Open Settings

Search Agents

Search Calls

42. DEMO DATA

Populate the application with realistic mock data.

Do NOT use:

John 1
John 2
Test Agent
Lorem ipsum

Use realistic examples.

Agents:

Receptionist AI
Sales Assistant
Support Copilot
Booking Assistant
Restaurant Ordering AI

Customers:

Arjun Rao
Priya Sharma
Rahul Verma
Ananya Reddy

Use realistic Indian + international examples.

Phone numbers should clearly be demo/test numbers.

43. DATA VISUALIZATION

Use Recharts.

Charts:

Call volume
Call duration
Credits
Agent activity
Orders
Revenue
Appointment volume

Keep charts clean.

No unnecessary 3D charts.

No visual clutter.

44. ACCESSIBILITY

Follow accessibility best practices.

Requirements:

Semantic HTML

Keyboard navigation

Focus states

ARIA labels

Proper contrast

Accessible dialogs

Accessible dropdowns

Screen-reader-friendly controls

Do not sacrifice accessibility for visual design.

45. PERFORMANCE

Keep the application fast.

Use:

Lazy-loaded routes

Reusable components

Memoization only when useful

Optimized icons

No huge images

No unnecessary dependencies

Avoid giant component files.

46. CODE QUALITY

Use TypeScript properly.

Do not use:

any

unless absolutely unavoidable.

Create proper types:

Agent

Call

Appointment

Product

Order

Webhook

ApiKey

UsageRecord

TeamMember

Notification

Namespace

47. ROUTING

Create routes for:

/dashboard

/agents

/agents/new

/agents/:id

/templates

/phone-numbers

/calls

/calls/:id

/recordings

/appointments

/catalog

/orders

/orders/:id

/webhooks

/developer

/developer/api-keys

/developer/docs

/usage

/team

/settings

48. AUTH UI

Create polished authentication pages even though backend authentication is not implemented yet.

Pages:

/login

/register

/forgot-password

/verify-email

Login:

Email
Password
Remember me
Forgot password
Sign in

Register:

Name
Email
Password
Confirm password
Create account

Also visually reserve space for future OAuth providers.

49. FIRST-TIME ONBOARDING

After registration, create an onboarding flow.

Step 1:

Welcome to Saketh AI

Step 2:

What are you building?

Options:

Customer Support
Sales
Appointments
Restaurant
Healthcare
Other

Step 3:

Create first agent

Step 4:

Choose agent type

Step 5:

Deploy

Then redirect to Dashboard.

50. MOBILE UX

On mobile:

Sidebar becomes a drawer.

Bottom navigation:

Home
Agents
Calls
Activity
More

Tables become cards.

Agent configuration becomes sections/accordions.

Charts become horizontally scrollable where necessary.

Dialogs become full-screen sheets where appropriate.

51. DESIGN SYSTEM

Create reusable design tokens.

Define:

--background

--foreground

--muted

--border

--primary

--secondary

--success

--warning

--danger

--radius

Use these consistently.

Typography hierarchy:

Display

Heading 1

Heading 2

Heading 3

Body

Small

Caption

Use one professional font family.

52. FINAL QUALITY BAR

The result should NOT look like:

"Lovable generated a dashboard."

It should look like:

"A funded startup has a polished AI SaaS product ready for users."

Every page must feel intentionally designed.

Every interaction should work.

Every button should have a meaningful action.

Every navigation item should lead somewhere.

Every page should contain realistic content.

No dead links.

No broken states.

No placeholder lorem ipsum.

No unnecessary decorative elements.

53. IMPORTANT IMPLEMENTATION RULE

Build the UI progressively but create the complete application structure.

Start with:

Global design system

Application shell

Routing

Dashboard

Agents

Agent builder

Templates

Calls

Call detail

Recordings

Appointments

Catalog

Orders

Webhooks

Developer API

Usage

Team

Settings

Authentication

Onboarding

After each major section, make sure it is responsive and visually consistent with the rest of the application.

54. MOST IMPORTANT REQUIREMENT

The reference platform is ONLY a functional reference.

Do NOT copy:

Layout

Colors

Sidebar design

Card design

Typography

Icons

Branding

Exact visual hierarchy

Exact page composition

Create our own product.

The final UI should be recognizable as an original AI Agent platform.

The product should feel cohesive across every page.

Build it as if this frontend will eventually connect to:

Node.js + Express + PostgreSQL + Drizzle + AI providers + voice infrastructure + telephony providers.

For now, use realistic mock data and a clean API/service abstraction.

Do not implement the backend.

Do not implement real payments.

Do not implement real telephony.

Do not claim that mock functionality is production-connected.

Focus entirely on creating an exceptional frontend foundation that we can connect to the real backend later.

FINAL OBJECTIVE

Build a complete, responsive, premium AI Agent SaaS dashboard called SAKETH AI with an original visual identity and all major screens listed above.

Prioritize:

Visual quality

UX

Consistency

Responsiveness

Reusable architecture

Realistic interactions

Clean TypeScript

Future backend integration

The result should feel like a serious AI infrastructure SaaS product, not a demo dashboard.    name is not saketh.ai its Ai platform

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a54bf554-0fd1-4ce1-964d-4050310aacec).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
