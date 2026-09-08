// All CREATE TABLE SQL statements for the platform
export const schema = `

  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- Users
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Workspaces
  CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'starter',
    credits DECIMAL(10,2) DEFAULT 10000,
    region VARCHAR(50) DEFAULT 'ap-south-1',
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Workspace Members
  CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(50) DEFAULT 'active',
    invited_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
  );

  -- Agents
  CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'voice',
    status VARCHAR(50) DEFAULT 'draft',
    model VARCHAR(255) DEFAULT 'openai/gpt-4o-mini',
    voice VARCHAR(255),
    language VARCHAR(50) DEFAULT 'en',
    instructions TEXT,
    greeting TEXT,
    tone VARCHAR(100),
    personality VARCHAR(100),
    tools JSONB DEFAULT '[]',
    calls_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Agent Templates
  CREATE TABLE IF NOT EXISTS agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    use_case TEXT,
    type VARCHAR(50) DEFAULT 'voice',
    icon VARCHAR(50),
    popularity INTEGER DEFAULT 0,
    instructions TEXT,
    greeting TEXT,
    tone VARCHAR(100),
    personality VARCHAR(100),
    tools JSONB DEFAULT '[]',
    model VARCHAR(255) DEFAULT 'openai/gpt-4o-mini',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Phone Numbers
  CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    number VARCHAR(50) NOT NULL,
    country VARCHAR(100),
    region VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    monthly_cost DECIMAL(10,2) DEFAULT 0,
    capabilities JSONB DEFAULT '["voice","sms"]',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Calls
  CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    reference VARCHAR(100),
    customer VARCHAR(255),
    customer_number VARCHAR(50),
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    agent_name VARCHAR(255),
    direction VARCHAR(50) DEFAULT 'inbound',
    status VARCHAR(50) DEFAULT 'completed',
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    cost DECIMAL(10,4) DEFAULT 0,
    has_recording BOOLEAN DEFAULT false,
    recording_url TEXT,
    intent TEXT,
    sentiment VARCHAR(50) DEFAULT 'neutral',
    outcome TEXT,
    summary TEXT,
    transcript JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Appointments
  CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    customer VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    agent_name VARCHAR(255),
    type VARCHAR(255),
    date DATE,
    time TIME,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Products (Catalog)
  CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    category VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    agent_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Orders
  CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    reference VARCHAR(100),
    customer VARCHAR(255),
    phone VARCHAR(50),
    items JSONB DEFAULT '[]',
    total DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    agent_name VARCHAR(255),
    channel VARCHAR(50) DEFAULT 'voice',
    timeline JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Webhooks
  CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Webhook Endpoint',
    url TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'healthy',
    events JSONB DEFAULT '[]',
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_delivery_at TIMESTAMPTZ,
    success_rate DECIMAL(5,2) DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Webhook Deliveries
  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_id VARCHAR(100),
    event_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'delivered',
    attempt INTEGER DEFAULT 1,
    http_status INTEGER,
    response TEXT,
    payload JSONB,
    duration_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ
  );

  -- API Keys
  CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255),
    key_hash VARCHAR(255) NOT NULL,
    masked_key VARCHAR(255),
    permission VARCHAR(50) DEFAULT 'read',
    requests_30d INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Usage Records
  CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    usage VARCHAR(255),
    amount DECIMAL(10,4),
    balance DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    body TEXT,
    kind VARCHAR(50),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Developer Projects
  CREATE TABLE IF NOT EXISTS developer_projects (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    provider VARCHAR(50),
    full_name VARCHAR(255),
    branch VARCHAR(100) DEFAULT 'main',
    branches JSONB DEFAULT '["main"]',
    visibility VARCHAR(50) DEFAULT 'private',
    language VARCHAR(100),
    framework VARCHAR(100),
    stack JSONB DEFAULT '[]',
    code_quality DECIMAL(5,2) DEFAULT 0,
    security DECIMAL(5,2) DEFAULT 0,
    coverage DECIMAL(5,2) DEFAULT 0,
    architecture_rating VARCHAR(50) DEFAULT 'Good',
    findings_summary JSONB DEFAULT '{"securityIssues":0,"reviewSuggestions":0,"missingTests":0,"architectureWarnings":0}',
    files JSONB DEFAULT '[]',
    structure JSONB DEFAULT '[]',
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- AI Tasks
  CREATE TABLE IF NOT EXISTS ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id VARCHAR(255),
    title TEXT,
    agent VARCHAR(100),
    status VARCHAR(50) DEFAULT 'waiting',
    files_changed INTEGER DEFAULT 0,
    result JSONB,
    user_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Dev Activity
  CREATE TABLE IF NOT EXISTS dev_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id VARCHAR(255),
    label TEXT,
    detail TEXT,
    agent VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Migration additions for webhooks
  ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Webhook Endpoint';
  ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS last_delivery_at TIMESTAMPTZ;
  ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  -- Migration additions for webhook_deliveries
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS event_id VARCHAR(100);
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'delivered';
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS attempt INTEGER DEFAULT 1;
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS http_status INTEGER;
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response TEXT;
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
  ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

`;
