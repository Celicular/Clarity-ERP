# Roudy ERP System - Complete Technical Documentation

**Version:** 1.0  
**Last Updated:** February 18, 2026  
**Database:** MySQL 8.0.41  
**Backend:** PHP  
**Frontend:** HTML5, JavaScript, Tailwind CSS

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Data Flow & Architecture](#data-flow--architecture)
4. [Core Functionalities](#core-functionalities)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Frontend Features](#frontend-features)
7. [Implementation Details](#implementation-details)
8. [File Structure](#file-structure)
9. [Installation & Setup](#installation--setup)
10. [Migration Guide](#migration-guide)

---

## System Overview

### Purpose
The Roudy ERP (Employee Resource Planning) System is a comprehensive web-based platform designed to manage:
- User authentication and role-based access
- Employee time tracking (sessions, breaks, overtime)
- Leave request management
- Meeting scheduling and management
- Payslip generation and distribution
- Employee activity reporting
- Automated agent-based check-in prompts

### Key Features
- **Role-Based Access Control:** Admin and Employee roles with distinct dashboards
- **Authentication:** Bcrypt password hashing with session management
- **Time Tracking:** Multi-session support with break tracking and overtime calculation
- **Leave Management:** Request submission, admin approval/rejection workflow
- **Meeting Coordination:** Meeting creation, attendee management, meeting remarks
- **Payroll:** Payslip generation with email distribution
- **Reporting:** Comprehensive analytics on employee activity, leaves, and work hours
- **Agent System:** Automated check-in prompts via pairing with external agents

### Technology Stack
- **Backend:** PHP 7.4+
- **Database:** MySQL 8.0+
- **Frontend:** HTML5, CSS3 (Tailwind CSS), JavaScript (ES6+)
- **Authentication:** Bcrypt hashing, Session-based
- **Email:** SMTP via EmailService class

---

## Database Schema

### Table 1: `users`
**Purpose:** Core user account data  
**Relations:** Primary table linked to most other tables

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| name | VARCHAR(100) | NOT NULL | User's display name |
| email | VARCHAR(100) | UNIQUE, NOT NULL | Email address (login credential) |
| password | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| role | ENUM('Employee','Admin') | DEFAULT 'Employee' | User role for access control |
| status | ENUM('Active','Inactive') | DEFAULT 'Active' | Account status |
| first_login | TINYINT(1) | DEFAULT 1 | Flag for first-time login (triggers onboarding) |
| profile_completed | TINYINT(1) | DEFAULT 0 | Whether profile has been completed |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification time |
| last_login | TIMESTAMP | NULL | Last login timestamp |

**Indexes:** `email` (UNIQUE), `role`, `status`, `first_login`

**Sample Data:**
```json
{
  "id": 1,
  "name": "Admin User",
  "email": "Admin@gmail.com",
  "password": "$2a$10$GCVsjUY3Yz0G2K8Ifpiv7ukhyGsfKgPolQNUaP6ofwE2qFOfxkbo6",
  "role": "Admin",
  "status": "Active",
  "first_login": 0
}
```

---

### Table 2: `user_details`
**Purpose:** Extended user profile information including work schedule and banking details  
**Foreign Key:** user_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| user_id | INT | FOREIGN KEY, UNIQUE | Links to users table |
| full_name | VARCHAR(150) | NOT NULL | Full legal name |
| phone_number | VARCHAR(20) | NOT NULL | Contact phone |
| date_of_birth | DATE | NULL | Employee DOB |
| gender | ENUM('Male','Female','Other') | NULL | Gender |
| address | VARCHAR(255) | NULL | Street address |
| city | VARCHAR(100) | NULL | City |
| state | VARCHAR(100) | NULL | State/Province |
| postal_code | VARCHAR(20) | NULL | Postal code |
| country | VARCHAR(100) | NULL | Country |
| employee_type | ENUM('Full-Time','Part-Time','Contract','Intern') | DEFAULT 'Full-Time' | Employment classification |
| department | VARCHAR(100) | NOT NULL | Department assignment |
| designation | VARCHAR(100) | NOT NULL | Job title |
| check_in_time | TIME | NULL | Daily shift start time (HH:MM:SS) |
| check_out_time | TIME | NULL | Daily shift end time (HH:MM:SS) |
| bank_account_number | VARCHAR(25) | NULL | Bank account for payroll |
| bank_name | VARCHAR(100) | NULL | Bank name |
| ifsc_code | VARCHAR(20) | NULL | IFSC code |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification time |

**Note:** Supports multi-day shifts (e.g., 19:00 to 04:00 next day)

---

### Table 3: `session_logs`
**Purpose:** Track employee work sessions with time segmentation  
**Foreign Key:** user_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique session identifier |
| user_id | INT | FOREIGN KEY | Logged-in user |
| date | DATE | NOT NULL | Date of session (CURDATE) |
| session_number | INT | NOT NULL | Session sequence for the day (1st, 2nd, 3rd, etc) |
| session_start_time | TIMESTAMP | NOT NULL | When user clicked "Log In" |
| session_end_time | TIMESTAMP | NULL | When user clicked "Log Out" |
| session_duration | INT | DEFAULT 0 | Total seconds (end_time - start_time) |
| break_count | INT | DEFAULT 0 | Number of breaks during session |
| total_break_duration | INT | DEFAULT 0 | Total break time in seconds |
| status | ENUM('completed','ongoing','abandoned') | DEFAULT 'completed' | Session state |
| overtime_early | INT | DEFAULT 0 | Seconds before check_in_time |
| shift_hours | INT | DEFAULT 0 | Seconds between check_in and check_out |
| overtime_late | INT | DEFAULT 0 | Seconds after check_out_time |
| total_overtime | INT | DEFAULT 0 | overtime_early + overtime_late |
| undertime | INT | DEFAULT 0 | Hours short from scheduled shift |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification time |

**Composite Key:** (user_id, date, session_number)  
**Indexes:** user_id, date, user_date, session_number, status, start_time

---

### Table 4: `breaks`
**Purpose:** Track individual breaks within sessions  
**Foreign Keys:** session_id → session_logs.id, user_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique break identifier |
| session_id | INT | FOREIGN KEY | Parent session |
| user_id | INT | FOREIGN KEY | User taking break |
| start_time | TIMESTAMP | NOT NULL | Break start time |
| end_time | TIMESTAMP | NULL | Break end time |
| duration | INT | DEFAULT 0 | Duration in seconds |
| reason | VARCHAR(255) | NOT NULL | Break category (Lunch, Restroom, Personal, Prayer, Stretch, etc) |
| notes | TEXT | NULL | Additional notes about break |
| status | ENUM('active','completed','cancelled') | DEFAULT 'completed' | Break state |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification time |

---

### Table 5: `user_activity`
**Purpose:** Daily activity summary for users  
**Foreign Key:** user_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| user_id | INT | FOREIGN KEY | User identifier |
| date | DATE | NOT NULL | Activity date |
| status | ENUM('logged_in','on_break','logged_out') | DEFAULT 'logged_out' | Current status |
| session_start_time | TIMESTAMP | NULL | First login time today |
| session_duration | INT | DEFAULT 0 | Seconds |
| login_count | INT | DEFAULT 0 | Number of logins today |
| total_break_time | INT | DEFAULT 0 | Accumulated break seconds |
| last_logged_in | TIMESTAMP | NULL | Most recent login |
| last_logged_out | TIMESTAMP | NULL | Most recent logout |
| last_break_start | TIMESTAMP | NULL | Last break start |
| last_break_end | TIMESTAMP | NULL | Last break end |
| total_shift_hours | INT | DEFAULT 0 | Hours within shift window |
| total_overtime | INT | DEFAULT 0 | Total early + late overtime |
| total_undertime | INT | DEFAULT 0 | Hours short from schedule |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification time |

**Unique Key:** (user_id, date) - one record per user per day

---

### Table 6: `leave_requests`
**Purpose:** Employee leave applications with approval workflow  
**Foreign Keys:** user_id → users.id, responded_by → users.id (admin)

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Request identifier |
| user_id | INT | FOREIGN KEY | Requesting employee |
| start_date | DATE | NOT NULL | First day of leave |
| end_date | DATE | NOT NULL | Last day of leave (can equal start_date) |
| reason | VARCHAR(500) | NOT NULL | Leave reason |
| criticality | ENUM('casual','emergency') | DEFAULT 'casual' | Leave type |
| status | ENUM('pending','approved','rejected') | DEFAULT 'pending' | Approval status |
| rejection_reason | VARCHAR(500) | NULL | Reason if rejected |
| requested_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Submission time |
| responded_at | TIMESTAMP | NULL | Admin response time |
| responded_by | INT | NULL, FOREIGN KEY | Admin user_id who responded |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification time |

---

### Table 7: `meetings`
**Purpose:** Meeting scheduling and management  
**Foreign Key:** created_by → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Meeting identifier |
| title | VARCHAR(255) | NOT NULL | Meeting title |
| description | LONGTEXT | NULL | Meeting description |
| agenda | LONGTEXT | NULL | Meeting agenda points |
| created_by | INT | FOREIGN KEY | Admin who created meeting |
| meeting_datetime | DATETIME | NOT NULL | When meeting occurs |
| gmeet_link | VARCHAR(500) | NULL | Google Meet URL |
| teams_link | VARCHAR(500) | NULL | Microsoft Teams URL |
| platform | ENUM('gmeet','teams') | NULL | Primary platform |
| status | ENUM('pending','in_progress','completed') | DEFAULT 'pending' | Meeting status |
| admin_remark | LONGTEXT | NULL | Admin notes/conclusion |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | AUTO UPDATE | Last modification time |

---

### Table 8: `meeting_attendees`
**Purpose:** Track meeting attendance  
**Foreign Keys:** meeting_id → meetings.id, user_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| meeting_id | INT | FOREIGN KEY | Meeting reference |
| user_id | INT | FOREIGN KEY | Attendee |
| attended | TINYINT(1) | DEFAULT 0 | Attendance confirmation |
| has_remarked | TINYINT(1) | DEFAULT 0 | Whether attendee added remark |
| added_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When attendee was added |

**Unique Key:** (meeting_id, user_id)

---

### Table 9: `meeting_remarks`
**Purpose:** Store attendee feedback on meetings  
**Foreign Keys:** meeting_id → meetings.id, user_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Remark identifier |
| meeting_id | INT | FOREIGN KEY | Meeting reference |
| user_id | INT | FOREIGN KEY | Attendee who remarked |
| remark | LONGTEXT | NOT NULL | Feedback/comment |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Timestamp |

---

### Table 10: `payslips`
**Purpose:** Employee salary statements  
**Foreign Key:** employee_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Payslip identifier |
| employee_id | INT | FOREIGN KEY | Employee reference |
| basic_pay | DECIMAL(10,2) | NOT NULL | Base salary |
| pf | DECIMAL(10,2) | NOT NULL | Provident Fund deduction |
| other_additions | DECIMAL(10,2) | DEFAULT 0.00 | Allowances/bonuses |
| other_deductions | DECIMAL(10,2) | DEFAULT 0.00 | Other deductions |
| gross_total | DECIMAL(10,2) | NOT NULL | Total before deductions |
| net_total | DECIMAL(10,2) | NOT NULL | Final payable amount |
| company_name | VARCHAR(255) | NULL | Organization name |
| company_address | TEXT | NULL | Organization address |
| prepared_by | VARCHAR(255) | NULL | HR preparer name |
| payment_method | VARCHAR(100) | NULL | e.g., 'Bank Transfer' |
| received_by | VARCHAR(255) | NULL | Employee signature/receipt |
| status | ENUM('pending','paid') | DEFAULT 'pending' | Payment status |
| created_date | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| payment_date | DATE | NULL | Actual payment date |
| email_sent | TINYINT(1) | DEFAULT 0 | Whether email was sent |
| email_sent_date | TIMESTAMP | NULL | Email send timestamp |

---

### Table 11: `agent_codes`
**Purpose:** Pairing codes for external agents  
**Foreign Key:** user_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Code identifier |
| user_id | INT | FOREIGN KEY | User this code belongs to |
| agent_code | CHAR(10) | UNIQUE | 10-digit numeric code |
| generated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Generation time |
| expires_at | DATETIME | NOT NULL | Expiration time (24h from generation) |
| is_paired | TINYINT(1) | DEFAULT 0 | Whether code has been paired |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation |
| updated_at | DATETIME | AUTO UPDATE | Last update |

---

### Table 12: `agent_bindings`
**Purpose:** Paired agent sessions with check-in times  
**Foreign Keys:** user_id → users.id, agent_code → agent_codes.agent_code

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Binding identifier |
| user_id | INT | FOREIGN KEY | Paired user |
| agent_code | CHAR(10) | FOREIGN KEY | Agent code (unique per user) |
| check_in_time | TIME | NOT NULL | Shift start |
| check_out_time | TIME | NOT NULL | Shift end |
| base_times | JSON | NOT NULL | 4 check-in prompt times (evenly distributed) |
| paired_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Pairing timestamp |
| expires_at | DATETIME | NOT NULL | Binding expiration |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation |
| updated_at | DATETIME | AUTO UPDATE | Last update |

**Example base_times:** `["20:36", "20:37", "20:38", "20:39"]`

---

### Table 13: `agent_manager`
**Purpose:** Individual check-in prompts from agent  
**Foreign Keys:** agent_code → agent_codes.agent_code, user_id → users.id

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Check-in identifier |
| agent_code | CHAR(10) | FOREIGN KEY | Associated agent |
| user_id | INT | FOREIGN KEY | User being prompted |
| scheduled_base_time | TIME | NOT NULL | Scheduled check-in time |
| actual_trigger_time | DATETIME | NULL | When check-in was actually triggered |
| status | ENUM('pending','completed','skipped_not_logged_in','expired') | DEFAULT 'pending' | Response status |
| user_response | JSON | NULL | User's response data: `{status: "present"/"break", notes: "...", timestamp: "..."}` |
| response_submitted_at | DATETIME | NULL | When response was recorded |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation |
| updated_at | DATETIME | AUTO UPDATE | Last update |

---

## Data Flow & Architecture

### User Authentication Flow
```
┌─────────────────────────────────────────────────────────┐
│ 1. User enters credentials on login.html               │
├─────────────────────────────────────────────────────────┤
│ 2. login.js sends POST to api/login.php                │
│    - Validates username/password                       │
│    - Checks against users table                        │
├─────────────────────────────────────────────────────────┤
│ 3. On success:                                          │
│    - Creates PHP session                               │
│    - Sets SESSION variables (user_id, role, etc)      │
│    - Returns success JSON                              │
├─────────────────────────────────────────────────────────┤
│ 4. Client redirects to index.html                      │
│    - Calls api/check-session.php                       │
│    - Validates active session                          │
├─────────────────────────────────────────────────────────┤
│ 5. Based on role:                                       │
│    - ADMIN → Show Admin Dashboard                      │
│    - EMPLOYEE → Check onboarding status               │
│      - If first_login=1 → Show onboarding modals       │
│      - Else → Show Employee Dashboard                  │
└─────────────────────────────────────────────────────────┘
```

### Session & Time Tracking Flow
```
┌──────────────────────────────────────────────────────┐
│ Employee Clicks "Login"                              │
├──────────────────────────────────────────────────────┤
│ API: activity.php?action=start-session               │
│ - Gets user's check_in_time, check_out_time         │
│ - Creates session_logs entry                         │
│ - Updates/creates user_activity for today            │
│ - Status: "completed" if manually closed             │
│         "ongoing" if session active                  │
│         "abandoned" if timeout                       │
├──────────────────────────────────────────────────────┤
│ During Session:                                      │
│ - Employee can take breaks                           │
│ - Each break: activity.php?action=start-break       │
│             activity.php?action=end-break            │
│ - Duration calculated: end_time - start_time        │
├──────────────────────────────────────────────────────┤
│ Employee Clicks "Logout"                             │
├──────────────────────────────────────────────────────┤
│ API: activity.php?action=end-session                 │
│ - Calculates total session duration                  │
│ - Determines shift window (handles multi-day)       │
│ - Segments time into:                                │
│   * overtime_early: before check_in_time            │
│   * shift_hours: during [check_in, check_out]       │
│   * overtime_late: after check_out_time             │
│ - Subtracts break time from each segment             │
│ - Calculates undertime if short of schedule         │
└──────────────────────────────────────────────────────┘
```

### Leave Request Workflow
```
┌────────────────────────────────────────────┐
│ 1. Employee submits leave request          │
│    - API: leaves.php?action=create-request │
│    - Data: start_date, end_date, reason   │
├────────────────────────────────────────────┤
│ 2. Request stored with status="pending"   │
├────────────────────────────────────────────┤
│ 3. Email sent to all admins               │
├────────────────────────────────────────────┤
│ 4. Admin sees pending request              │
│    - API: leaves.php?action=list-requests │
├────────────────────────────────────────────┤
│ 5. Admin approves or rejects               │
│    - Approve: leaves.php?action=approve   │
│    - Reject: leaves.php?action=reject     │
│    - Status updated, email sent            │
└────────────────────────────────────────────┘
```

### Agent Check-in Flow
```
┌─────────────────────────────────────────────────────┐
│ 1. Employee generates pairing code                  │
│    - API: agent.php?action=generate-code           │
│    - Returns 10-digit numeric code (24h expiry)    │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│ 2. External Python Agent receives code              │
│    - Agent calls: agent.php?action=pair-agent      │
│    - Code validated and marked as paired           │
│    - 4 base_times calculated (shift ÷ 4)           │
│    - agent_bindings record created                 │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│ 3. Agent triggers random check-ins                  │
│    - 4 times throughout shift                       │
│    - Each at scheduled_base_time                   │
│    - Calls: agent.php?action=validate-session      │
│    - Checks if user logged in                      │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│ 4. User responds (Yes/No)                           │
│    - API: agent.php?action=submit-response         │
│    - Response recorded with timestamp               │
│    - Status updated in agent_manager               │
└─────────────────────────────────────────────────────┘
```

### Database Relationships Diagram
```
users (1) ── (∞) user_details
  ├─ (1) ── (∞) session_logs
  │          ├─ (1) ── (∞) breaks
  │          └─ (1) ── (∞) agent_manager
  │
  ├─ (1) ── (∞) user_activity
  │
  ├─ (1) ── (∞) leave_requests (user_id)
  ├─ (1) ── (∞) leave_requests (responded_by)
  │
  ├─ (1) ── (∞) meetings (created_by)
  ├─ (1) ── (∞) meeting_attendees
  ├─ (1) ── (∞) meeting_remarks
  │
  ├─ (1) ── (∞) payslips
  │
  ├─ (1) ── (∞) agent_codes
  ├─ (1) ── (∞) agent_bindings
  │
  └─ (1) ── (∞) agent_manager

agent_codes (1) ── (1) agent_bindings
agent_codes (1) ── (∞) agent_manager
```

---

## Core Functionalities

### 1. Authentication & Authorization
**Functionality:** User login/logout with role-based access control

**Process:**
- Email-based login with bcrypt password verification
- Master password bypass for admins
- Session creation and validation
- Role-based dashboard routing

**Related Tables:** `users`

**API Endpoints:**
- `POST api/login.php` - User authentication
- `GET api/check-session.php` - Validate session
- `POST api/logout.php` - Destroy session

---

### 2. Onboarding System
**Functionality:** Mandatory first-time user profile setup

**Process:**
1. On first login (`first_login=1`), user directed to onboarding
2. Required steps:
   - Change default password
   - Complete profile (name, phone, department, etc)
   - Set check-in/check-out times
   - Add banking details
3. Profile marked complete (`profile_completed=1`)

**Related Tables:** `users`, `user_details`

**API Endpoints:**
- `GET api/onboarding.php?action=check` - Check status
- `POST api/onboarding.php?action=reset-password` - Update password
- `POST api/onboarding.php?action=complete-profile` - Complete profile

---

### 3. Time & Attendance Tracking
**Functionality:** Track employee work sessions with break management

**Process:**
1. **Session Start:**
   - User clicks "Log In"
   - `session_logs` record created
   - User status set to "active"

2. **During Session:**
   - Employee can start/end breaks
   - Each break tracked in `breaks` table
   - Reason and notes recorded

3. **Session End:**
   - User clicks "Log Out"
   - Session duration calculated
   - Time segmented:
     - overtime_early = time before check_in_time
     - shift_hours = time within [check_in, check_out]
     - overtime_late = time after check_out_time
   - Break duration subtracted from appropriate segment
   - Undertime calculated if session < required hours

4. **Multi-Day Shifts:**
   - System handles shifts spanning midnight
   - Example: 19:00 check_in to 04:00 check_out
   - Time calculation wraps to next day

**Related Tables:** `session_logs`, `breaks`, `user_activity`

**API Endpoints:**
- `GET api/activity.php?action=start-session` - Start work session
- `GET api/activity.php?action=end-session` - End work session
- `GET api/activity.php?action=start-break` - Start break
- `GET api/activity.php?action=end-break` - End break
- `GET api/activity.php?action=get-session-breaks` - Get break list

---

### 4. Leave Management
**Functionality:** Employee leave requests with admin approval workflow

**Process:**
1. **Employee submits request:**
   - start_date, end_date, reason, criticality
   - Request created with status='pending'

2. **Admin reviews:**
   - Sees all pending requests
   - Can approve or reject
   - Can filter by status

3. **Approval notification:**
   - Email sent to employee
   - If rejected, includes rejection_reason
   - If approved, employee record updated

**Leave Types:**
- Casual: Regular leave
- Emergency: Urgent unplanned leave

**Related Tables:** `leave_requests`

**API Endpoints:**
- `POST api/leaves.php?action=create-request` - Submit request
- `GET api/leaves.php?action=my-requests` - Employee's requests
- `GET api/leaves.php?action=list-requests` - Admin: all requests
- `GET api/leaves.php?action=pending-count` - Admin: pending count
- `POST api/leaves.php?action=approve` - Admin: approve
- `POST api/leaves.php?action=reject` - Admin: reject

---

### 5. Meeting Management
**Functionality:** Schedule meetings with attendee management and feedback

**Process:**
1. **Admin creates meeting:**
   - Title, datetime, attendees, platform (GMeet/Teams)
   - Notification emails sent to attendees

2. **Attendee management:**
   - Attendee list with attendance tracking
   - Attendees can add remarks/feedback

3. **Meeting status:**
   - pending → in_progress → completed

**Related Tables:** `meetings`, `meeting_attendees`, `meeting_remarks`

**API Endpoints:**
- `POST api/meetings.php?action=create` - Create meeting
- `GET api/meetings.php?action=list` - List meetings
- `GET api/meetings.php?action=get-my-meetings` - Employee meetings
- `POST api/meetings.php?action=approve` - Approve meeting
- `POST api/meetings.php?action=conclude` - End meeting
- `POST api/meetings.php?action=remark` - Add feedback

---

### 6. Payroll Management
**Functionality:** Generate and distribute payslips

**Process:**
1. **Admin creates payslip:**
   - Selects employee
   - Enters basic_pay, deductions (PF, etc), additions
   - Calculates gross and net totals
   - Records payment details

2. **Payslip distribution:**
   - Email sent to employee
   - Employee views payslip
   - Employee marks as received

3. **Payment tracking:**
   - Payment date recorded
   - Status: pending → paid
   - Email delivery tracked

**Related Tables:** `payslips`

**API Endpoints:**
- `POST api/payslips.php?action=create` - Create payslip (admin)
- `GET api/payslips.php?action=list` - List payslips (admin)
- `GET api/payslips.php?action=get-detail` - View payslip
- `GET api/payslips.php?action=my-payslips` - Employee: my payslips
- `POST api/payslips.php?action=mark-received` - Mark as received
- `POST api/payslips.php?action=send-email` - Resend email

---

### 7. Activity Reporting
**Functionality:** Generate analytics on employee activity, leaves, and work hours

**Reports Available:**

**a) Employee Activity Report**
- Daily login/logout times
- Session frequency
- Total hours worked
- Customizable date range (default: 30 days)

**b) Leave Summary Report**
- Leave requests per employee
- Breakdown by status (pending/approved/rejected)
- Casualty type analysis
- Total approved days

**c) Work Hours Report**
- Shift hours vs overtime comparison
- Average daily work hours
- Overtime hours per employee
- Days worked

**d) Attendance Report**
- Present/absent/on-leave per employee
- Attendance percentage
- Monthly summary

**Related Tables:** `session_logs`, `leave_requests`, `user_activity`

**API Endpoints:**
- `GET api/reports.php?action=employee-activity` - Activity report
- `GET api/reports.php?action=leave-summary` - Leave report
- `GET api/reports.php?action=work-hours` - Work hours report
- `GET api/reports.php?action=attendance` - Attendance report

---

### 8. Agent-Based Check-in System
**Functionality:** Automated random check-in prompts via external agents

**Process:**
1. **Code Generation:**
   - Employee generates 10-digit code via app
   - Code expires in 24 hours
   - Each user can have multiple active agents

2. **Agent Pairing:**
   - External Python agent uses code to pair
   - `agent_bindings` created
   - 4 base_times calculated (shift ÷ 4)
   - Expiration set to code expiration time

3. **Check-in Prompts:**
   - At each base_time, agent prompts user
   - `agent_manager` records created (status: pending)
   - Validates user is logged in
   - If not logged in: marked as 'skipped_not_logged_in'

4. **User Response:**
   - User responds with Yes/No
   - Optional status: 'present' or 'break'
   - Response recorded with timestamp
   - Time deviation calculated

**Related Tables:** `agent_codes`, `agent_bindings`, `agent_manager`

**API Endpoints:**
- `GET api/agent.php?action=generate-code` - Generate pairing code
- `GET api/agent.php?action=get-code` - Get existing code
- `POST api/agent.php?action=pair-agent` - Pair external agent (public)
- `POST api/agent.php?action=validate-session` - Check login (public)
- `POST api/agent.php?action=submit-response` - Record response (public)
- `GET api/agent.php?action=get-checkin-status` - Get next prompt (public)
- `POST api/agent.php?action=mark-missed-checks` - Mark as missed (public)

---

### 9. User Management (Admin Only)
**Functionality:** Create, update, delete user accounts; manage roles and status

**Process:**
1. **Create user:**
   - Admin creates new account
   - Assigns role (Employee/Admin)
   - Sets initial password

2. **Update user:**
   - Change name, email, role, status
   - Deactivate/reactivate accounts

3. **Delete user:**
   - Remove user account (cascades to related data)
   - Linked records can be deleted or archived

4. **View users:**
   - List with filtering (role, status, search)

**Related Tables:** `users`, `user_details`

**API Endpoints:**
- `POST api/users.php?action=create` - Create user (admin)
- `GET api/users.php?action=list` - List users (admin)
- `GET api/users.php?action=get` - Get user details
- `GET api/users.php?action=get-current` - Get current user
- `PUT api/users.php?action=update` - Update user (admin)
- `DELETE api/users.php?action=delete` - Delete user (admin)
- `POST api/users.php?action=change-password` - Admin reset password
- `POST api/users.php?action=update-profile` - Employee update profile

---

## API Endpoints Reference

### Authentication APIs

#### **POST api/login.php**
**Purpose:** Authenticate user and create session

**Parameters:**
```json
{
  "username": "string (min 3 chars)",
  "password": "string"
}
```

**Response on Success:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Admin|Employee",
    "status": "Active|Inactive"
  }
}
```

**HTTP Status:** 200 (success), 400 (invalid username), 401 (wrong password)

---

#### **GET api/check-session.php**
**Purpose:** Validate active user session

**Parameters:** None (uses session cookie)

**Response on Success:**
```json
{
  "success": true,
  "message": "Session is active.",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Admin|Employee"
  }
}
```

**HTTP Status:** 200 (valid session), 401 (no session)

---

#### **POST api/logout.php**
**Purpose:** Destroy user session

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "message": "Logout successful."
}
```

---

### Activity APIs

#### **GET api/activity.php?action=start-session**
**Purpose:** Record work session start

**Returns:**
```json
{
  "success": true,
  "message": "Session started",
  "session_log_id": 123
}
```

---

#### **GET api/activity.php?action=end-session**
**Purpose:** Record work session end with time segmentation

**Returns:**
```json
{
  "success": true,
  "message": "Session ended",
  "session_id": 123,
  "shift_hours": 8.5,
  "overtime_early": 0.25,
  "overtime_late": 0.5,
  "total_break_duration": 1.25
}
```

---

#### **GET api/activity.php?action=start-break**
**Purpose:** Start break period

**Query Parameters:**
- `reason` (optional): Break reason
- `notes` (optional): Additional notes

**Returns:**
```json
{
  "success": true,
  "message": "Break started",
  "break_id": 456
}
```

---

#### **GET api/activity.php?action=end-break**
**Purpose:** End break period and calculate duration

**Returns:**
```json
{
  "success": true,
  "message": "Break ended",
  "break_duration": 900
}
```

---

#### **GET api/activity.php?action=check-ongoing-session**
**Purpose:** Check if user has active session

**Returns:**
```json
{
  "success": true,
  "has_ongoing_session": true,
  "session_log_id": 123,
  "session_start_time": "2025-01-12T09:00:00",
  "breaks": [...]
}
```

---

#### **GET api/activity.php?action=user-activity** (Admin only)
**Purpose:** Get activity dashboard data

**Query Parameters:**
- `days` (optional): Number of days (default: 7)
- `user_id` (optional): Specific user

**Returns:**
```json
{
  "success": true,
  "activity": [
    {
      "user_id": 1,
      "name": "John Doe",
      "date": "2025-01-12",
      "status": "logged_in",
      "login_count": 2,
      "total_hours": 8.5
    }
  ]
}
```

---

### Leave APIs

#### **POST api/leaves.php?action=create-request**
**Purpose:** Submit leave request

**Parameters:**
```json
{
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD (optional, defaults to start_date)",
  "reason": "string",
  "criticality": "casual|emergency (default: casual)"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Leave request submitted successfully",
  "request_id": 123
}
```

---

#### **GET api/leaves.php?action=my-requests**
**Purpose:** Get current user's leave requests

**Returns:**
```json
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "start_date": "2025-02-01",
      "end_date": "2025-02-05",
      "reason": "Vacation",
      "criticality": "casual",
      "status": "pending|approved|rejected"
    }
  ]
}
```

---

#### **GET api/leaves.php?action=list-requests** (Admin only)
**Purpose:** List all leave requests

**Query Parameters:**
- `status` (optional): Filter by status

**Returns:**
```json
{
  "success": true,
  "requests": [...]
}
```

---

#### **POST api/leaves.php?action=approve** (Admin only)
**Purpose:** Approve leave request

**Parameters:**
```json
{
  "request_id": 123
}
```

---

#### **POST api/leaves.php?action=reject** (Admin only)
**Purpose:** Reject leave request

**Parameters:**
```json
{
  "request_id": 123,
  "rejection_reason": "string"
}
```

---

### Meeting APIs

#### **POST api/meetings.php?action=create** (Admin only)
**Purpose:** Create new meeting

**Parameters:**
```json
{
  "title": "string",
  "meeting_datetime": "YYYY-MM-DD HH:MM:SS",
  "attendee_ids": [1, 2, 3],
  "description": "string (optional)",
  "agenda": "string (optional)",
  "gmeet_link": "URL (optional)",
  "teams_link": "URL (optional)",
  "platform": "gmeet|teams (optional)"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Meeting created successfully",
  "meeting_id": 456
}
```

---

#### **GET api/meetings.php?action=get-my-meetings**
**Purpose:** Get meetings user is attending

**Returns:**
```json
{
  "success": true,
  "meetings": [
    {
      "id": 1,
      "title": "Team Standup",
      "meeting_datetime": "2025-01-12T14:00:00",
      "status": "pending",
      "has_remarked": false,
      "meeting_link": "https://..."
    }
  ]
}
```

---

#### **POST api/meetings.php?action=remark**
**Purpose:** Add feedback/remark to meeting

**Parameters:**
```json
{
  "meeting_id": 1,
  "remark": "string"
}
```

---

### Payslip APIs

#### **POST api/payslips.php?action=create** (Admin only)
**Purpose:** Create payslip

**Parameters:**
```json
{
  "employee_id": 1,
  "basic_pay": 50000,
  "pf": 5000,
  "gross_total": 55000,
  "net_total": 52000,
  "other_additions": 0 (optional),
  "other_deductions": 0 (optional),
  "company_name": "string (optional)",
  "payment_method": "string (optional)"
}
```

---

#### **GET api/payslips.php?action=my-payslips**
**Purpose:** Get employee's payslips

**Returns:**
```json
{
  "success": true,
  "payslips": [
    {
      "id": 1,
      "month": "2025-01",
      "basic_pay": 50000,
      "net_total": 52000,
      "payment_date": "2025-01-31",
      "is_received": false
    }
  ]
}
```

---

#### **POST api/payslips.php?action=mark-received**
**Purpose:** Employee marks payslip as received

**Parameters:**
```json
{
  "payslip_id": 1
}
```

---

### Reports APIs (Admin only)

#### **GET api/reports.php?action=employee-activity**
**Query Parameters:**
- `days` (int): Period to analyze (default: 30)

**Returns:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-12",
      "user_id": 1,
      "employee_name": "John Doe",
      "session_count": 2,
      "total_hours": 8.5
    }
  ]
}
```

---

#### **GET api/reports.php?action=leave-summary**
**Returns:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 1,
      "employee_name": "John Doe",
      "pending_count": 2,
      "approved_count": 5,
      "rejected_count": 1
    }
  ]
}
```

---

#### **GET api/reports.php?action=work-hours**
**Query Parameters:**
- `days` (int): Period (default: 30)

**Returns:**
```json
{
  "success": true,
  "summary": {
    "total_shift_hours": 160,
    "total_overtime_hours": 12.5
  },
  "by_employee": [...]
}
```

---

### Agent APIs

#### **GET api/agent.php?action=generate-code** (Authenticated)
**Purpose:** Generate agent pairing code

**Returns:**
```json
{
  "success": true,
  "code": "1234567890",
  "expires_at": "2025-01-13T10:30:00",
  "is_new": true
}
```

---

#### **POST api/agent.php?action=pair-agent** (Public)
**Purpose:** Pair agent with code

**Parameters:**
```json
{
  "agent_code": "1234567890"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Agent paired successfully",
  "base_times": ["10:00", "11:30", "13:00", "14:30"]
}
```

---

#### **POST api/agent.php?action=validate-session** (Public)
**Purpose:** Check if user logged in

**Parameters:**
```json
{
  "agent_code": "1234567890",
  "scheduled_base_time": "10:00"
}
```

**Returns:**
```json
{
  "success": true,
  "valid": true,
  "message": "User is logged in"
}
```

---

#### **POST api/agent.php?action=submit-response** (Public)
**Purpose:** Record user's check-in response

**Parameters:**
```json
{
  "agent_code": "1234567890",
  "scheduled_base_time": "10:00",
  "response": "yes|no",
  "current_time": "2025-01-12T10:05:00Z",
  "status": "present|break (optional)"
}
```

---

### Users APIs

#### **GET api/users.php?action=get**
**Query Parameters:**
- `id` (int): User ID to retrieve

**Returns:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Admin|Employee",
    "full_name": "John Michael Doe",
    "phone_number": "1234567890",
    "department": "Engineering",
    "designation": "Senior Developer",
    "check_in_time": "09:00",
    "check_out_time": "17:00"
  }
}
```

---

#### **GET api/users.php?action=list** (Admin only)
**Query Parameters:**
- `role` (optional): Filter by role
- `status` (optional): Filter by status
- `search` (optional): Search by name/email

**Returns:**
```json
{
  "success": true,
  "users": [...]
}
```

---

#### **POST api/users.php?action=create** (Admin only)
**Purpose:** Create new user

**Parameters:**
```json
{
  "username": "string",
  "email": "string",
  "name": "string",
  "role": "Admin|Employee",
  "password": "string"
}
```

---

#### **PUT api/users.php?action=update** (Admin only)
**Purpose:** Update user information

**Parameters:**
```json
{
  "user_id": 1,
  "name": "string (optional)",
  "email": "string (optional)",
  "role": "Admin|Employee (optional)",
  "status": "Active|Inactive (optional)"
}
```

---

#### **DELETE api/users.php?action=delete** (Admin only)
**Purpose:** Delete user account

**Query Parameters:**
- `user_id` (int): User to delete

---

### Onboarding APIs

#### **GET api/onboarding.php?action=check**
**Purpose:** Check onboarding status

**Returns:**
```json
{
  "success": true,
  "first_login": true|false,
  "profile_completed": true|false
}
```

---

#### **POST api/onboarding.php?action=reset-password**
**Purpose:** Change password (required on first login)

**Parameters:**
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

---

#### **POST api/onboarding.php?action=complete-profile**
**Purpose:** Complete user profile during onboarding

**Parameters:**
```json
{
  "full_name": "string",
  "phone_number": "string",
  "department": "string",
  "designation": "string",
  "employee_type": "Full-Time|Part-Time|Contract|Intern",
  "date_of_birth": "YYYY-MM-DD (optional)",
  "gender": "Male|Female|Other (optional)",
  "address": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)",
  "postal_code": "string (optional)",
  "country": "string (optional)",
  "check_in_time": "HH:MM (optional)",
  "check_out_time": "HH:MM (optional)",
  "bank_account_number": "string (optional)",
  "bank_name": "string (optional)",
  "ifsc_code": "string (optional)"
}
```

---

### Download API

#### **GET api/download.php?file=filename**
**Purpose:** Download whitelisted files

**Query Parameters:**
- `file` (string): Filename (must be whitelisted)

**Whitelisted Files:**
- `Roudy.exe`
- `RoudClient.exe`

---

## Frontend Features

### Login Interface (login.html)
- Two-column responsive layout
- Email/username and password input
- "Remember me" option
- Client-side validation
- Error message display
- Smooth animations and transitions
- Mobile-responsive design
- Company logo display

### Dashboard Routing (index.html)
- Session validation on page load
- Onboarding check and redirect
- Role-based dashboard display
- Mobile hamburger menu
- Logout functionality
- User greeting display

### Admin Dashboard Features

**1. Dashboard Overview**
- Statistics cards showing:
  - Total users
  - Active sessions
  - Pending approvals (leaves, meetings)
  - Payslips sent
- Chart visualizations (Chart.js)

**2. User Management**
- List all users with filtering
- Create new user accounts
- Edit user information
- Deactivate/activate users
- Delete users
- View user details

**3. Activity Monitoring**
- View all employee sessions
- Filter by date, user, status
- Session details with time breakdown
- Break history
- Overtime calculation visualization

**4. Leave Management**
- View all leave requests
- Filter by status (pending/approved/rejected)
- Approve/reject with reason
- View employee details
- Email notifications sent

**5. Meeting Management**
- Create meetings
- Select attendees
- Set platform (GMeet/Teams)
- Add agenda points
- View meeting status
- See attendee remarks

**6. Payroll Management**
- Create payslips for employees
- View all payslips
- Track payment status
- Resend emails
- Download payslip reports

**7. Reports & Analytics**
- Employee activity report (customizable date range)
- Leave summary by employee
- Work hours analysis
- Attendance tracking
- Export capabilities

### Employee Dashboard Features

**1. Dashboard Overview**
- Welcome greeting
- Current session status
- Today's shift information
- Pending requests/notifications

**2. Time Tracking**
- "Log In" / "Log Out" buttons
- "Start Break" / "End Break" buttons
- Current session duration
- Break tracking
- Session history for today

**3. My Profile**
- View personal information
- Edit phone number
- Update banking details
- View check-in/check-out times
- Onboarding status

**4. Leave Management**
- Submit leave request
- View my requests
- Track request status
- See approval/rejection reason

**5. Meetings**
- View assigned meetings
- See meeting details
- Access meeting links
- Add remarks/feedback
- Track attendance

**6. Payslips**
- View all payslips
- Download payslips
- Mark as received
- View payment history

**7. Activity**
- View session history
- Break details
- Daily summary
- Weekly/monthly stats

### Mobile Responsiveness
- Hamburger menu for navigation
- Collapsible sidebar
- Touch-friendly buttons
- Optimized card layouts
- Mobile-first design approach
- Responsive tables with horizontal scroll
- Tailwind CSS breakpoints (sm, md, lg, xl)

### UI Components (Tailwind CSS)
- Color-coded badges (role, status, leave type)
- Hover effects and transitions
- Modal dialogs for forms
- Dropdown menus
- Data tables with pagination
- Form inputs with validation
- Toast notifications
- Loading indicators

---

## Implementation Details

### Database Connection (api/db.php)
```php
$host = 'localhost';
$db_user = 'root';
$db_password = '';  // Update with actual password
$db_name = 'rouderp';

$conn = new mysqli($host, $db_user, $db_password, $db_name);
```

### Password Hashing (Bcrypt)
```php
// Creating hash
$password_hash = password_hash($password, PASSWORD_BCRYPT);

// Verifying password
password_verify($user_input, $stored_hash);
```

### Session Management
```php
session_start();
$_SESSION['user_id'] = $user_id;
$_SESSION['user_name'] = $user_name;
$_SESSION['user_email'] = $user_email;
$_SESSION['user_role'] = $user_role;
$_SESSION['login_time'] = time();
```

### Email Service (api/Mail/EmailService.php)
- SMTP configuration stored in EmailConfig.php
- Used for:
  - Leave request notifications
  - Leave approval/rejection
  - Meeting invitations
  - Payslip distribution
  - Password reset (if needed)
- Template-based email generation

### Time Calculation Logic
```
1. Multi-day shift detection:
   - If check_out_time < check_in_time → shift spans midnight

2. Time segmentation:
   - overtime_early = time before check_in_time
   - shift_hours = time within [check_in, check_out]
   - overtime_late = time after check_out_time

3. Break time subtraction:
   - Subtract from appropriate segment based on break timing

4. Undertime calculation:
   - If shift_hours < (check_out - check_in)
   - Record shortage
```

### Agent Base Times Calculation
```
Shift duration = check_out_time - check_in_time
Interval = Shift duration ÷ 4
base_times[0] = check_in_time + interval
base_times[1] = check_in_time + (interval × 2)
base_times[2] = check_in_time + (interval × 3)
base_times[3] = check_out_time
```

### Error Handling
- Try-catch blocks for all API calls
- Database error logging without exposing sensitive details
- Client-side form validation
- HTTP status codes (200, 400, 401, 403, 404, 500)
- JSON error responses with descriptive messages

### Security Measures
- Session validation on all protected endpoints
- Role-based access control (RBAC)
- Input validation and sanitization
- CSRF protection via session tokens (if needed)
- SQL injection prevention via prepared statements
- HTTPOnly cookie flags
- SameSite=Lax for cookies
- Master bypass password for admin emergency access

---

## File Structure

```
project-root/
│
├── Frontend Files
│   ├── login.html                    # Login page
│   ├── login.js                      # Login form logic
│   ├── index.html                    # Main dashboard (routing hub)
│   ├── script.js                     # Dashboard routing & core logic (1975 lines)
│   ├── admin-dashboard-users.js      # User management (2105 lines)
│   ├── breaks-ui.js                  # Break UI management
│   ├── meetings-ui.js                # Meetings UI management
│   ├── payslips-ui.js                # Payslips UI management
│   ├── onboarding.js                 # Onboarding modals logic
│   ├── agent.js                      # Agent integration UI
│   ├── styles.css                    # Custom styles
│   └── assets/
│       └── logo.png                  # Company logo
│
├── Backend Files
│   ├── api/
│   │   ├── db.php                    # Database connection
│   │   ├── login.php                 # Authentication
│   │   ├── logout.php                # Session destruction
│   │   ├── check-session.php         # Session validation
│   │   ├── activity.php              # Time tracking APIs
│   │   ├── leaves.php                # Leave management APIs
│   │   ├── meetings.php              # Meeting management APIs
│   │   ├── payslips.php              # Payroll APIs
│   │   ├── reports.php               # Reporting APIs
│   │   ├── users.php                 # User management APIs
│   │   ├── agent.php                 # Agent system APIs
│   │   ├── onboarding.php            # Onboarding APIs
│   │   ├── download.php              # File download APIs
│   │   ├── migrate.php               # Database migration
│   │   ├── config/
│   │   │   └── EmailConfig.php       # Email SMTP settings
│   │   └── Mail/
│   │       └── EmailService.php      # Email sending service
│   │
│   └── database_schemas/             # Historical schema files
│       ├── complete_schema.sql       # Full current schema
│       ├── user_activity_schema.sql
│       ├── session_logs_schema.sql
│       ├── leave_requests_schema.sql
│       ├── meetings_schema.sql
│       ├── payslips_schema.sql
│       ├── agent_system_schema.sql
│       └── ... (other schema files)
│
├── Configuration Files
│   ├── .htaccess                     # Apache configuration (if needed)
│   ├── README.md                     # Original README
│   └── API_DOCUMENTATION.md          # Original API docs
│
├── Python Bot (Optional)
│   ├── bot/
│   │   ├── agent_example.py          # Example agent script
│   │   ├── agent_headless.py         # Headless agent runner
│   │   ├── agent_requirements.txt    # Python dependencies
│   │   ├── agent_config.ini          # Agent configuration
│   │   ├── WorkerAgent.spec          # PyInstaller spec
│   │   └── build_agent.bat           # Build script
│   │
│   ├── Database Files
│   ├── db.sql                        # Main database dump
│   └── ERP_COMPLETE_DOCUMENTATION.md # This file
```

---

## Installation & Setup

### Prerequisites
- PHP 7.4+ with MySQLi extension
- MySQL 8.0+ server
- Web server (Apache/Nginx)
- Modern web browser
- Node.js (optional, for frontend tooling)

### Step 1: Database Setup
```sql
-- Create database
CREATE DATABASE IF NOT EXISTS rouderp;
USE rouderp;

-- Execute db.sql to create all tables
SOURCE db.sql;
```

### Step 2: Configure Database Connection
**File:** `api/db.php`
```php
$host = 'localhost';
$db_user = 'root';
$db_password = 'your_password';  // Update
$db_name = 'rouderp';
```

### Step 3: Configure Email Service (Optional)
**File:** `api/config/EmailConfig.php`
```php
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'your_email@gmail.com');
define('SMTP_PASS', 'your_app_password');
define('FROM_EMAIL', 'noreply@companyname.com');
```

### Step 4: Set Up Web Server
- Place project in web root (e.g., `htdocs/` for Apache)
- Ensure write permissions on `api/` directory
- Configure virtual host if needed

### Step 5: Create Admin User
```sql
INSERT INTO users (name, email, password, role, status, first_login, profile_completed)
VALUES (
  'Admin User',
  'admin@example.com',
  '$2y$10$yU1yiusKcGSzrxDIzAN9T.z2U6Hi9GosicXDh6sDY3EDiilZzH5mO',  -- password: 'admin'
  'Admin',
  'Active',
  0,
  1
);
```

### Step 6: Test Login
- Navigate to `http://localhost/project/login.html`
- Login with credentials
- Verify session creation and dashboard display

---

## Migration Guide

### Preparing for Migration

#### 1. Export Current Database
```bash
# MySQL export
mysqldump -u root -p rouderp > backup_rouderp_$(date +%Y%m%d).sql

# Or use phpMyAdmin: Export > Custom > Select all tables
```

#### 2. Copy Project Files
```bash
# Copy entire project directory
cp -r /path/to/rouderp /destination/path/
```

#### 3. Export Configuration Settings
```bash
# Document current settings from:
# - api/db.php (database credentials)
# - api/config/EmailConfig.php (email settings)
# - .env or config files (if any)
```

### New Environment Setup

#### 1. Create New Database
```sql
CREATE DATABASE rouderp_new;
USE rouderp_new;

-- Source the complete schema
SOURCE database_schemas/complete_schema.sql;
```

#### 2. Import Data (if migrating existing data)
```bash
mysql -u root -p rouderp_new < backup_rouderp_YYYYMMDD.sql
```

#### 3. Update Configuration
**File:** `api/db.php`
```php
$host = 'new_server_host';
$db_user = 'new_user';
$db_password = 'new_password';
$db_name = 'rouderp_new';
```

**File:** `api/config/EmailConfig.php`
```php
// Update SMTP settings for new environment
```

#### 4. Update Frontend Configuration (if needed)
**File:** `script.js`
```javascript
// Update API base URL if needed
const API_BASE = 'http://new_server/api/';
```

#### 5. Test All Functionalities
- User login/logout
- Session management
- Time tracking
- Leave requests
- Meetings
- Payslips
- Reports
- Agent system

#### 6. Migrate Related Data
```bash
# Copy uploaded files, agents, logs, etc.
cp -r /path/to/uploads /new/path/
cp -r /path/to/logs /new/path/
```

### Post-Migration Checklist
- [ ] Database connectivity verified
- [ ] All users can login
- [ ] Admin dashboard displays correctly
- [ ] Employee dashboard displays correctly
- [ ] Time tracking functional
- [ ] Leave requests working
- [ ] Meetings display correctly
- [ ] Payslips generate
- [ ] Reports display data
- [ ] Email notifications sending
- [ ] Agent system connecting (if used)
- [ ] Backup of old system verified

---

## Common Customizations

### Adding New Field to User Profile
1. Add column to `user_details` table:
```sql
ALTER TABLE user_details ADD COLUMN custom_field VARCHAR(255);
```

2. Update onboarding form in `onboarding.js`:
```javascript
// Add field to form
// Update JSON payload to include new field
```

3. Update `onboarding.php` to save new field

### Extending Reports
1. Create new report function in `reports.php`
2. Add new endpoint action
3. Create frontend display in dashboard
4. Add menu item to navigation

### Adding New Break Reason
1. Update `breaks` table `reason` field options (if ENUM)
   Or add new break type category
2. Update break UI to include new option
3. No database migration needed if using VARCHAR

### Customizing Email Templates
1. Modify `EmailService.php`
2. Create template files in `api/Mail/templates/`
3. Update email body generation logic

---

## Troubleshooting

### Common Issues

**Issue:** "Session not found" on login
- Check PHP session directory permissions
- Verify `session_start()` called in `api/check-session.php`
- Check session cookie in browser

**Issue:** Database connection error
- Verify credentials in `api/db.php`
- Check MySQL server is running
- Check database name is correct

**Issue:** Time tracking calculations incorrect
- Verify check_in_time and check_out_time are set correctly
- Check timezone settings in PHP
- Verify timestamps in database

**Issue:** Emails not sending
- Check SMTP credentials in `EmailConfig.php`
- Verify email port (usually 587 for TLS, 465 for SSL)
- Check firewall isn't blocking SMTP port
- Verify "From" email address format

**Issue:** Agent pairing failing
- Verify agent_code is valid and not expired
- Check user is logged in when pairing
- Verify agent_code not already paired

---

## Performance Notes

### Database Optimization
- Indexes created on frequently queried columns
- Composite indexes for common filter combinations
- Foreign key relationships for referential integrity

### Recommended Database Maintenance
```sql
-- Regular maintenance
OPTIMIZE TABLE session_logs;
OPTIMIZE TABLE breaks;
OPTIMIZE TABLE user_activity;

-- Archive old sessions (if table grows large)
-- Move sessions older than 1 year to archive table
```

### Caching Strategies
- Cache user details after login (reduces queries)
- Cache meeting list for dashboard
- Cache report data with short TTL (5-10 minutes)

---

**Documentation Version:** 1.0  
**Last Updated:** February 18, 2026  
**Created for:** Project Migration and Documentation

---

## Appendix: Database Query Examples

### Get User's Total Hours for Date Range
```sql
SELECT 
  u.name,
  DATE(sl.date) as date,
  SUM(sl.shift_hours) / 3600 as shift_hours,
  SUM(sl.total_overtime) / 3600 as overtime_hours
FROM session_logs sl
JOIN users u ON sl.user_id = u.id
WHERE sl.user_id = ? 
  AND DATE(sl.date) BETWEEN ? AND ?
GROUP BY DATE(sl.date)
ORDER BY sl.date DESC;
```

### Get Pending Leave Requests
```sql
SELECT 
  lr.*,
  u.name as employee_name,
  u.email
FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
WHERE lr.status = 'pending'
ORDER BY lr.requested_at DESC;
```

### Get Meeting Attendance Summary
```sql
SELECT 
  m.title,
  m.meeting_datetime,
  COUNT(ma.id) as attendee_count,
  SUM(ma.attended) as attended_count,
  COUNT(mr.id) as remark_count
FROM meetings m
LEFT JOIN meeting_attendees ma ON m.id = ma.meeting_id
LEFT JOIN meeting_remarks mr ON m.id = mr.meeting_id
GROUP BY m.id
ORDER BY m.meeting_datetime DESC;
```

### Get Employee Payslip Summary
```sql
SELECT 
  u.name,
  MONTH(p.payment_date) as month,
  SUM(p.net_total) as total_paid,
  COUNT(p.id) as payslip_count
FROM payslips p
JOIN users u ON p.employee_id = u.id
WHERE YEAR(p.payment_date) = YEAR(CURDATE())
GROUP BY u.id, MONTH(p.payment_date)
ORDER BY u.name, month DESC;
```

---

**End of Documentation**
