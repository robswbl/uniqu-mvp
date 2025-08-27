# Agency Login System — Cursor Playbook

**Purpose**: Implement a separate, secure login system for agencies to manage their clients and access agency-specific functionality, replacing the current rudimentary agency routing structure.

**Scope (now)**: Create a complete agency authentication system with separate login, dashboard, and client management capabilities, while maintaining the existing user system.

**Out of scope (later)**: Integration with Auth0 or similar external authentication providers, advanced agency features like billing or reporting.

---

## Ground Rules
- Maintain backward compatibility with existing user authentication system
- Use Supabase for authentication and database operations
- Implement proper role-based access control (RBAC)
- Follow SvelteKit best practices for routing and state management
- Ensure security through proper session management and validation

**Suggested dependencies to add if missing**: 
- `@supabase/supabase-js` (already present)
- `bcryptjs` for password hashing (already present)
- `uuid` for generating unique identifiers (already present)

---

## Milestone Checklist (high level)
- [x] 0. [Database Schema Setup] - Create agency users table and relationships
- [x] 1. [Agency Authentication Routes] - Implement login, signup, and session management
- [x] 2. [Agency Dashboard] - Create main agency interface with client management
- [ ] 3. [Client Management Integration] - Connect agency users to their clients
- [ ] 4. [Security & Access Control] - Implement proper RBAC and session validation
- [ ] 5. [UI/UX Polish] - Improve agency interface and user experience
- [ ] 6. [Testing & Validation] - Ensure all agency functions work correctly
- [ ] 7. [Documentation & Cleanup] - Document agency system and clean up old code

> Use the **Notes by Cursor** / **Notes by You** blocks to track progress and decisions.

---

## Step 0 — [Database Schema Setup] (no behavior change)
**Objective**: Create the necessary database tables and relationships to support agency users without breaking existing functionality

**Tasks for Cursor**
- [x] Create agency_users table with proper authentication fields
- [x] Add agency_user_roles table for role-based access control
- [x] Create agency_sessions table for agency authentication sessions
- [x] Update existing agencies table if needed for new relationships
- [x] Add proper indexes and constraints for performance and data integrity

**Acceptance**
- [x] All new tables created successfully in Supabase
- [x] Existing functionality continues to work unchanged
- [x] Database schema supports future agency authentication features

**Notes by Cursor**:
- [2025-01-24] Created database schema migration script `create_agency_auth_tables.sql`
- Tables created: agency_users, agency_user_roles, agency_sessions
- Implemented proper RLS policies and indexes
- Added default roles: admin, manager, agent, viewer
- Schema follows uniqu naming convention and references existing agencies table

**Notes by You**:
- 

---

## Step 1 — [Agency Authentication Routes]
**Objective**: Implement complete agency authentication system with login, signup, and session management

**Tasks for Cursor**
- [x] Create /agency/login route with agency login form
- [x] Create /agency/signup route for agency registration
- [x] Implement agency session management and validation
- [x] Create agency authentication middleware and guards
- [x] Add agency logout functionality

**Acceptance**
- [x] Agencies can register new accounts with proper validation
- [x] Agency login works and creates secure sessions
- [x] Agency sessions are properly validated across protected routes
- [x] Logout properly clears agency sessions

**Notes by Cursor**:
- [2025-01-24] Created agency authentication routes: /agency/login and /agency/signup
- Implemented agency session management with localStorage and database validation
- Created agencyAuth.ts utility library for session management, permissions, and validation
- Added logout functionality that clears both localStorage and database sessions
- Created agency dashboard route /agency/dashboard with authentication protection

**Notes by You**:
- 

---

## Step 2 — [Agency Dashboard]
**Objective**: Create a comprehensive agency dashboard that replaces the current basic agency routing

**Tasks for Cursor**
- [x] Create /agency/dashboard route as main agency interface
- [x] Implement agency profile management
- [x] Create client overview and management interface
- [x] Add agency settings and configuration options
- [x] Implement proper navigation and layout for agency users

**Acceptance**
- [x] Agency dashboard loads with proper authentication
- [x] Agency users can view and manage their profile
- [x] Client list and management functions work correctly
- [x] Navigation is intuitive and agency-specific

**Notes by Cursor**:
- [2025-01-24] Created comprehensive agency dashboard at /agency/dashboard
- Implemented authentication protection with session validation
- Added stats overview (total clients, active clients, completed questionnaires, pending actions)
- Created quick actions section with role-based permissions
- Added recent clients table with navigation to client details
- Implemented recent activities timeline
- Added proper logout functionality and user profile display

**Notes by You**:
- 

---

## Step 3 — [Client Management Integration]
**Objective**: Connect agency users to their clients and implement proper client management functionality

**Tasks for Cursor**
- [Update client assignment logic to work with agency users]
- [Implement client search and filtering capabilities]
- [Add client activity tracking and history]
- [Create client document generation and management]
- [Implement proper client-agency relationship management]

**Acceptance**
- [Agency users can view all their assigned clients]
- [Client management functions work seamlessly]
- [Client data is properly secured and accessible only to relevant agencies]
- [Client activities and documents are properly tracked]

**Notes by Cursor**:
- 

**Notes by You**:
- 

---

## Step 4 — [Security & Access Control]
**Objective**: Implement comprehensive security measures and role-based access control

**Tasks for Cursor**
- [Implement proper RBAC for different agency user types]
- [Add session validation and security checks]
- [Implement proper data isolation between agencies]
- [Add audit logging for agency actions]
- [Create security middleware for all agency routes]

**Acceptance**
- [Agency users can only access their own data and clients]
- [Sessions are properly validated and secure]
- [Data isolation prevents cross-agency access]
- [All agency actions are properly logged and auditable]

**Notes by Cursor**:
- 

**Notes by You**:
- 

---

## Step 5 — [UI/UX Polish]
**Objective**: Improve the agency interface and user experience to match professional standards

**Tasks for Cursor**
- [Implement responsive design for agency interface]
- [Add proper loading states and error handling]
- [Create intuitive navigation and user flows]
- [Implement proper form validation and user feedback]
- [Add accessibility features and keyboard navigation]

**Acceptance**
- [Agency interface is responsive and works on all devices]
- [User experience is smooth and intuitive]
- [Forms provide clear validation and feedback]
- [Interface meets accessibility standards]

**Notes by Cursor**:
- 

**Notes by You**:
- 

---

## Step 6 — [Testing & Validation]
**Objective**: Ensure all agency system functions work correctly and securely

**Tasks for Cursor**
- [Test agency authentication flows end-to-end]
- [Validate client management functionality]
- [Test security measures and access controls]
- [Verify data isolation and privacy]
- [Test error handling and edge cases]

**Acceptance**
- [All agency functions work as expected]
- [Security measures are effective]
- [Data privacy and isolation are maintained]
- [Error handling is graceful and informative]

**Notes by Cursor**:
- 

**Notes by You**:
- 

---

## Step 7 — [Documentation & Cleanup]
**Objective**: Document the agency system and clean up old, unused code

**Tasks for Cursor**
- [Document agency system architecture and usage]
- [Create setup and configuration guides]
- [Clean up old agency routing code]
- [Update existing documentation]
- [Create migration guide for existing agencies]

**Acceptance**
- [Agency system is fully documented]
- [Old code is removed and cleaned up]
- [Documentation is clear and comprehensive]
- [Migration path is clear for existing users]

**Notes by Cursor**:
- 

**Notes by You**:
- 

---

## API Contracts / Data Structures
**Agency User Interface**: 
- Inputs: email, password, agency_id, role
- Outputs: authentication token, user profile, permissions
- Data formats: JSON for API, proper validation for forms

**Agency Session Management**: 
- Inputs: authentication credentials
- Outputs: session token, user context, permissions
- Data formats: JWT-like tokens, secure session storage

**Client Management Interface**: 
- Inputs: client search criteria, management actions
- Outputs: client lists, client details, activity history
- Data formats: Paginated results, detailed client objects

**Integration Points**: 
- Agency authentication integrates with existing Supabase setup
- Client management connects to existing user and questionnaire systems
- Session management works alongside existing user authentication

---

## Testing Matrix
- [Agency registration] — [Creates account and sends confirmation]
- [Agency login] — [Authenticates and creates session]
- [Client assignment] — [Properly links clients to agencies]
- [Data isolation] — [Agencies can only see their own data]
- [Session security] — [Sessions are properly validated and secured]
- [Error handling] — [Invalid credentials and edge cases handled gracefully]
- [Performance] — [Dashboard loads quickly with proper pagination]
- [Rollback scenario] — [System can fall back to existing authentication if needed]

---

## Operational Commands
- [Database migrations: Run Supabase SQL scripts for new tables]
- [Local development: npm run dev with proper environment variables]
- [Testing: npm run test for agency system validation]
- [Build: npm run build to compile production version]
- [Deploy: Deploy to production environment with database updates]

---

## Troubleshooting Hints
- If agency login fails, check Supabase authentication settings and RLS policies
- If client data isn't loading, verify agency-user relationships in database
- If sessions are invalid, check session storage and validation logic
- If performance is slow, verify database indexes and query optimization
- If cross-agency data access occurs, check RLS policies and data isolation

---

## Change Log (append items here)
- [2025-01-24] - [Created playbook for agency login system] - [Assistant]
- [Date] - [Change description] - [Who made it]

