/**
 * lib/migrate.js
 * Creates all database tables for the ERP.
 * Run once: npm run db:migrate
 * Safe to re-run (uses IF NOT EXISTS / exception handling).
 */

require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();

  try {
    console.log("🔧  Running ERP migrations...\n");

    /* ──────────────────────────────────────────────────
       1. ENUMs
    ────────────────────────────────────────────────── */
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'EMPLOYEE');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("   ✓ user_role enum");

    /* ──────────────────────────────────────────────────
       2. users — core table (add missing columns)
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,
        email             TEXT UNIQUE NOT NULL,
        password          TEXT NOT NULL,
        role              user_role NOT NULL DEFAULT 'EMPLOYEE',
        status            TEXT NOT NULL DEFAULT 'Active',
        first_login       BOOLEAN NOT NULL DEFAULT TRUE,
        profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
        last_login        TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),
        created_by        TEXT
      );
    `);
    // Add columns if upgrading from an older schema
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'Active',
        ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log("   ✓ users table");

    /* ──────────────────────────────────────────────────
       3. user_details — extended profile + schedule
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_details (
        id                  TEXT PRIMARY KEY,
        user_id             TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name           TEXT NOT NULL,
        phone_number        TEXT NOT NULL,
        date_of_birth       DATE,
        gender              TEXT,
        address             TEXT,
        city                TEXT,
        state               TEXT,
        postal_code         TEXT,
        country             TEXT,
        employee_type       TEXT NOT NULL DEFAULT 'Full-Time',
        department          TEXT NOT NULL DEFAULT '',
        designation         TEXT NOT NULL DEFAULT '',
        check_in_time       TIME,
        check_out_time      TIME,
        bank_account_number TEXT,
        bank_name           TEXT,
        ifsc_code           TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ user_details table");

    /* ──────────────────────────────────────────────────
       4. session_logs — work sessions with time segments
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_logs (
        id                   TEXT PRIMARY KEY,
        user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date                 DATE NOT NULL,
        login_date           DATE,
        logout_date          DATE,
        session_number       INT NOT NULL DEFAULT 1,
        session_start_time   TIMESTAMPTZ NOT NULL,
        session_end_time     TIMESTAMPTZ,
        session_duration     INT NOT NULL DEFAULT 0,
        break_count          INT NOT NULL DEFAULT 0,
        total_break_duration INT NOT NULL DEFAULT 0,
        status               TEXT NOT NULL DEFAULT 'ongoing',
        overtime_early       INT NOT NULL DEFAULT 0,
        shift_hours          INT NOT NULL DEFAULT 0,
        overtime_late        INT NOT NULL DEFAULT 0,
        total_overtime       INT NOT NULL DEFAULT 0,
        undertime            INT NOT NULL DEFAULT 0,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, date, session_number)
      );
    `);
    console.log("   ✓ session_logs table");

    /* ──────────────────────────────────────────────────
       5. breaks — individual break records
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS breaks (
        id          TEXT PRIMARY KEY,
        session_id  TEXT NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time  TIMESTAMPTZ NOT NULL,
        end_time    TIMESTAMPTZ,
        duration    INT NOT NULL DEFAULT 0,
        reason      TEXT NOT NULL DEFAULT 'Personal',
        notes       TEXT,
        status      TEXT NOT NULL DEFAULT 'active',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ breaks table");

    /* ──────────────────────────────────────────────────
       6. user_activity — daily aggregated summary
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id                  TEXT PRIMARY KEY,
        user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date                DATE NOT NULL,
        status              TEXT NOT NULL DEFAULT 'logged_out',
        session_start_time  TIMESTAMPTZ,
        session_duration    INT NOT NULL DEFAULT 0,
        login_count         INT NOT NULL DEFAULT 0,
        total_break_time    INT NOT NULL DEFAULT 0,
        last_logged_in      TIMESTAMPTZ,
        last_logged_out     TIMESTAMPTZ,
        last_break_start    TIMESTAMPTZ,
        last_break_end      TIMESTAMPTZ,
        total_shift_hours   INT NOT NULL DEFAULT 0,
        total_overtime      INT NOT NULL DEFAULT 0,
        total_undertime     INT NOT NULL DEFAULT 0,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `);
    console.log("   ✓ user_activity table");

    /* ──────────────────────────────────────────────────
       7. leave_requests
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id               TEXT PRIMARY KEY,
        user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leave_type       TEXT NOT NULL DEFAULT 'Casual',
        start_date       DATE NOT NULL,
        end_date         DATE NOT NULL,
        total_days       INT NOT NULL DEFAULT 1,
        reason           TEXT NOT NULL,
        criticality      TEXT NOT NULL DEFAULT 'Normal',
        status           TEXT NOT NULL DEFAULT 'pending',
        reviewed_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
        rejection_reason TEXT,
        reviewed_at      TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ leave_requests table");

    /* ──────────────────────────────────────────────────
       8. meetings
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        description  TEXT,
        scheduled_at TIMESTAMPTZ NOT NULL,
        duration_min INT NOT NULL DEFAULT 60,
        platform     TEXT NOT NULL DEFAULT 'GMeet',
        meeting_link TEXT,
        status       TEXT NOT NULL DEFAULT 'pending',
        created_by   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        concluded_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ meetings table");

    /* ──────────────────────────────────────────────────
       9. meeting_attendees
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_attendees (
        id          TEXT PRIMARY KEY,
        meeting_id  TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attended    BOOLEAN NOT NULL DEFAULT FALSE,
        added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(meeting_id, user_id)
      );
    `);
    console.log("   ✓ meeting_attendees table");

    /* ──────────────────────────────────────────────────
       10. meeting_remarks
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_remarks (
        id         TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        remark     TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ meeting_remarks table");

    /* ──────────────────────────────────────────────────
       11. payslips
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id               TEXT PRIMARY KEY,
        user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_by       TEXT NOT NULL REFERENCES users(id),
        pay_period_start DATE NOT NULL,
        pay_period_end   DATE NOT NULL,
        basic_pay        NUMERIC(12,2) NOT NULL DEFAULT 0,
        hra              NUMERIC(12,2) NOT NULL DEFAULT 0,
        travel_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
        other_additions  NUMERIC(12,2) NOT NULL DEFAULT 0,
        gross_pay        NUMERIC(12,2) NOT NULL DEFAULT 0,
        pf_deduction     NUMERIC(12,2) NOT NULL DEFAULT 0,
        tax_deduction    NUMERIC(12,2) NOT NULL DEFAULT 0,
        other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
        net_pay          NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_mode     TEXT NOT NULL DEFAULT 'Bank Transfer',
        payment_date     DATE,
        status           TEXT NOT NULL DEFAULT 'pending',
        notes            TEXT,
        received_at      TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ payslips table");

    /* ──────────────────────────────────────────────────
       12. sub_roles
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS sub_roles (
        id         TEXT PRIMARY KEY,
        department TEXT NOT NULL,
        name       TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(department, name)
      );
    `);
    console.log("   ✓ sub_roles table");

    /* ──────────────────────────────────────────────────
       12b. sub_sub_roles — children of sub_roles
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS sub_sub_roles (
        id          TEXT PRIMARY KEY,
        sub_role_id TEXT NOT NULL REFERENCES sub_roles(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(sub_role_id, name)
      );
    `);
    console.log("   ✓ sub_sub_roles table");

    /* ── Add sub_role_id & sub_sub_role_id to user_details if not already present ── */
    await client.query(`
      ALTER TABLE user_details
        ADD COLUMN IF NOT EXISTS sub_role_id TEXT REFERENCES sub_roles(id) ON DELETE SET NULL;
    `);
    await client.query(`
      ALTER TABLE user_details
        ADD COLUMN IF NOT EXISTS sub_sub_role_id TEXT REFERENCES sub_sub_roles(id) ON DELETE SET NULL;
    `);
    console.log("   ✓ user_details.sub_role_id + sub_sub_role_id columns");

    /* ──────────────────────────────────────────────────
       13. notes
    ────────────────────────────────────────────────── */

    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id          TEXT PRIMARY KEY,
        created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic       TEXT NOT NULL,
        description TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'pending',
        elevated_to TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ notes table");

    /* ──────────────────────────────────────────────────
       14. lead_statuses — configurable pipeline stages
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_statuses (
        id         TEXT PRIMARY KEY,
        label      TEXT NOT NULL,
        slug       TEXT UNIQUE NOT NULL,
        position   INT  NOT NULL DEFAULT 0,
        color      TEXT NOT NULL DEFAULT '#3b82f6',
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ lead_statuses table");

    /* ── Seed default pipeline stages (idempotent) ── */
    await client.query(`
      INSERT INTO lead_statuses (id, label, slug, position, color, is_default) VALUES
        ('ls-1', 'New Lead',     'new_lead',     1, '#3b82f6', TRUE),
        ('ls-2', 'Contacted',    'contacted',    2, '#8b5cf6', FALSE),
        ('ls-3', 'Qualified',    'qualified',    3, '#06b6d4', FALSE),
        ('ls-4', 'Proposal',     'proposal',     4, '#f59e0b', FALSE),
        ('ls-5', 'Negotiation',  'negotiation',  5, '#f97316', FALSE),
        ('ls-6', 'Won',          'won',          6, '#22c55e', FALSE),
        ('ls-7', 'Lost',         'lost',         7, '#ef4444', FALSE)
      ON CONFLICT (slug) DO NOTHING;
    `);
    console.log("   ✓ lead_statuses seeded");

    /* ──────────────────────────────────────────────────
       15. leads
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        email           TEXT,
        phone           TEXT,
        company         TEXT,
        source          TEXT NOT NULL DEFAULT 'Manual',
        criticality     TEXT NOT NULL DEFAULT 'Normal',
        status_slug     TEXT NOT NULL DEFAULT 'new_lead' REFERENCES lead_statuses(slug) ON UPDATE CASCADE,
        assigned_to     TEXT REFERENCES users(id) ON DELETE SET NULL,
        notes           TEXT,
        is_duplicate    BOOLEAN NOT NULL DEFAULT FALSE,
        merged_into     TEXT REFERENCES leads(id) ON DELETE SET NULL,
        webhook_payload JSONB,
        created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ leads table");

    /* ──────────────────────────────────────────────────
       16. lead_activity — per-lead event timeline
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_activity (
        id         TEXT PRIMARY KEY,
        lead_id    TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        actor_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        payload    JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ lead_activity table");

    /* ──────────────────────────────────────────────────
       17. webhook_tokens — secure inbound credentials
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_tokens (
        id         TEXT PRIMARY KEY,
        token      TEXT UNIQUE NOT NULL,
        label      TEXT NOT NULL,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ webhook_tokens table");

    /* ──────────────────────────────────────────────────
       18. lead_followups — scheduled next-action reminders
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_followups (
        id           TEXT PRIMARY KEY,
        lead_id      TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        created_by   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        due_at       TIMESTAMPTZ NOT NULL,
        note         TEXT,
        priority     TEXT NOT NULL DEFAULT 'Normal',
        status       TEXT NOT NULL DEFAULT 'pending',
        completed_at TIMESTAMPTZ,
        completed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ lead_followups table");

    /* ──────────────────────────────────────────────────
       19. lead_interactions — call/demo/meeting notes
    ────────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_interactions (
        id             TEXT PRIMARY KEY,
        lead_id        TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        actor_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type           TEXT NOT NULL DEFAULT 'call',
        notes          TEXT NOT NULL,
        interacted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ lead_interactions table");

    /* ── 20. proposals ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id              TEXT PRIMARY KEY,
        lead_id         TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        created_by      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        version         INT NOT NULL DEFAULT 1,
        status          TEXT NOT NULL DEFAULT 'draft',
        title           TEXT NOT NULL DEFAULT 'Proposal',
        validity_date   DATE,
        notes           TEXT,
        discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
        subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
        total           NUMERIC(14,2) NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ proposals table");

    /* ── 21. proposal_items ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposal_items (
        id           TEXT PRIMARY KEY,
        proposal_id  TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        description  TEXT NOT NULL,
        qty          NUMERIC(10,2) NOT NULL DEFAULT 1,
        unit_price   NUMERIC(14,2) NOT NULL DEFAULT 0,
        amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
        sort_order   INT NOT NULL DEFAULT 0
      );
    `);
    console.log("   ✓ proposal_items table");

    /* ── 22. lead_attachments ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_attachments (
        id           TEXT PRIMARY KEY,
        lead_id      TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        uploaded_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename     TEXT NOT NULL,
        stored_name  TEXT NOT NULL,
        mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
        file_size    BIGINT NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ lead_attachments table");

    /* ── 23. clients ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id          TEXT PRIMARY KEY,
        created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        industry    TEXT,
        website     TEXT,
        phone       TEXT,
        email       TEXT,
        address     TEXT,
        notes       TEXT,
        tags        TEXT[] DEFAULT '{}',
        status      TEXT NOT NULL DEFAULT 'active',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ clients table");

    /* ── 24. client_contacts ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_contacts (
        id          TEXT PRIMARY KEY,
        client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        role        TEXT,
        email       TEXT,
        phone       TEXT,
        is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ client_contacts table");

    /* ── 25. developer_profiles ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS developer_profiles (
        user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        skills       TEXT[] DEFAULT '{}',
        rating       NUMERIC(3,1) NOT NULL DEFAULT 3.0,
        availability TEXT NOT NULL DEFAULT 'available',
        notes        TEXT,
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ developer_profiles table");

    /* ── 26. projects ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id              TEXT PRIMARY KEY,
        lead_id         TEXT REFERENCES leads(id) ON DELETE SET NULL,
        client_id       TEXT REFERENCES clients(id) ON DELETE SET NULL,
        created_by      TEXT NOT NULL REFERENCES users(id),
        assigned_dev    TEXT REFERENCES users(id) ON DELETE SET NULL,
        name            TEXT NOT NULL,
        description     TEXT,
        status          TEXT NOT NULL DEFAULT 'active',
        priority        TEXT NOT NULL DEFAULT 'Normal',
        deadline        DATE,
        deal_value      NUMERIC(14,2) DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ projects table");

    /* ── 27. project_activity ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_activity (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        actor_id    TEXT NOT NULL REFERENCES users(id),
        event_type  TEXT NOT NULL,
        payload     JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ project_activity table");

    /* ── 28. project_tasks ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_by  TEXT NOT NULL REFERENCES users(id),
        assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
        title       TEXT NOT NULL,
        description TEXT,
        status      TEXT NOT NULL DEFAULT 'todo',
        priority    TEXT NOT NULL DEFAULT 'Normal',
        due_date    DATE,
        sort_order  INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ project_tasks table");

    /* ── 29. project_subtasks ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_subtasks (
        id          TEXT PRIMARY KEY,
        task_id     TEXT NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        done        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ project_subtasks table");

    /* ── 30. project_timeline ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_timeline (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        author_id   TEXT NOT NULL REFERENCES users(id),
        content     TEXT NOT NULL,
        entry_type  TEXT NOT NULL DEFAULT 'update',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ project_timeline table");

    /* ── 31. project_time_logs ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_time_logs (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id     TEXT NOT NULL REFERENCES users(id),
        date        DATE NOT NULL,
        hours       NUMERIC(5,2) NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ project_time_logs table");

    /* ── 32. project_bugs ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_bugs (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        reported_by TEXT NOT NULL REFERENCES users(id),
        assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
        title       TEXT NOT NULL,
        description TEXT,
        priority    TEXT NOT NULL DEFAULT 'Normal',
        status      TEXT NOT NULL DEFAULT 'open',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );
    `);
    console.log("   ✓ project_bugs table");

    /* ── 33. project_files ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_files (
        id           TEXT PRIMARY KEY,
        project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        uploaded_by  TEXT NOT NULL REFERENCES users(id),
        filename     TEXT NOT NULL,
        stored_name  TEXT NOT NULL,
        mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
        file_size    BIGINT NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ project_files table");

    /* ── 34. invoices ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id            TEXT PRIMARY KEY,
        project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_by    TEXT NOT NULL REFERENCES users(id),
        invoice_number TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'draft',
        subtotal      NUMERIC(14,2) NOT NULL DEFAULT 0,
        tax_pct       NUMERIC(5,2) NOT NULL DEFAULT 0,
        discount_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
        total         NUMERIC(14,2) NOT NULL DEFAULT 0,
        due_date      DATE,
        notes         TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("   ✓ invoices table");

    /* ── 35. invoice_items ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id           TEXT PRIMARY KEY,
        invoice_id   TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description  TEXT NOT NULL,
        qty          NUMERIC(10,2) NOT NULL DEFAULT 1,
        unit_price   NUMERIC(14,2) NOT NULL DEFAULT 0,
        amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
        sort_order   INT NOT NULL DEFAULT 0
      );
    `);
    console.log("   ✓ invoice_items table");

    /* ── 36. payments ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id           TEXT PRIMARY KEY,
        invoice_id   TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        amount       NUMERIC(14,2) NOT NULL,
        method       TEXT NOT NULL DEFAULT 'bank_transfer',
        reference    TEXT,
        paid_at      DATE NOT NULL,
        notes        TEXT,
        created_by   TEXT NOT NULL REFERENCES users(id),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ payments table");

    /* ── 37. project_expenses ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_expenses (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_by  TEXT NOT NULL REFERENCES users(id),
        category    TEXT NOT NULL DEFAULT 'other',
        description TEXT NOT NULL,
        amount      NUMERIC(14,2) NOT NULL,
        expense_date DATE NOT NULL,
        receipt_url TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ project_expenses table");

    /* ── 38. auditlogs ── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditlogs (
        id          TEXT PRIMARY KEY,
        action      TEXT NOT NULL,
        criticality TEXT NOT NULL DEFAULT 'Low',
        done_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
        done_by_ip  TEXT,
        time        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("   ✓ auditlogs table");

    /* ── Indexes ── */




    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_session_logs_user_date ON session_logs(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_session_logs_status    ON session_logs(status);
      CREATE INDEX IF NOT EXISTS idx_breaks_session         ON breaks(session_id);
      CREATE INDEX IF NOT EXISTS idx_breaks_user            ON breaks(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_user     ON user_activity(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_date     ON user_activity(date);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_user    ON leave_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status  ON leave_requests(status);
      CREATE INDEX IF NOT EXISTS idx_meetings_status        ON meetings(status);
      CREATE INDEX IF NOT EXISTS idx_meeting_attendees      ON meeting_attendees(meeting_id);
      CREATE INDEX IF NOT EXISTS idx_payslips_user          ON payslips(user_id);
      CREATE INDEX IF NOT EXISTS idx_payslips_status        ON payslips(status);
      CREATE INDEX IF NOT EXISTS idx_notes_elevated_to      ON notes(elevated_to);
      CREATE INDEX IF NOT EXISTS idx_auditlogs_time         ON auditlogs(time);
      CREATE INDEX IF NOT EXISTS idx_auditlogs_action       ON auditlogs(action);
    `);
    console.log("   ✓ indexes");

    console.log("\n✅  All migrations complete.");

  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((e) => {
  console.error("❌  Migration failed:", e.message);
  process.exit(1);
});
