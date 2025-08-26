-- Migration to create agency authentication system tables
-- Run this in your Supabase SQL editor

-- 1. Create agency_users table for agency authentication
CREATE TABLE IF NOT EXISTS uniqu.agency_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    agency_id UUID NOT NULL REFERENCES uniqu.agencies(id) ON DELETE CASCADE,
    role_id UUID, -- Will reference agency_user_roles table
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create agency_user_roles table for role-based access control
CREATE TABLE IF NOT EXISTS uniqu.agency_user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create agency_sessions table for agency authentication sessions
CREATE TABLE IF NOT EXISTS uniqu.agency_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_user_id UUID NOT NULL REFERENCES uniqu.agency_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add foreign key constraint for role_id in agency_users
ALTER TABLE uniqu.agency_users 
ADD CONSTRAINT fk_agency_users_role 
FOREIGN KEY (role_id) REFERENCES uniqu.agency_user_roles(id) ON DELETE SET NULL;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agency_users_email ON uniqu.agency_users(email);
CREATE INDEX IF NOT EXISTS idx_agency_users_agency_id ON uniqu.agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_role_id ON uniqu.agency_users(role_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_is_active ON uniqu.agency_users(is_active);

CREATE INDEX IF NOT EXISTS idx_agency_user_roles_name ON uniqu.agency_user_roles(name);
CREATE INDEX IF NOT EXISTS idx_agency_user_roles_is_active ON uniqu.agency_user_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_agency_sessions_token ON uniqu.agency_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_agency_sessions_user_id ON uniqu.agency_sessions(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_agency_sessions_expires_at ON uniqu.agency_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_agency_sessions_is_active ON uniqu.agency_sessions(is_active);

-- 6. Insert default roles
INSERT INTO uniqu.agency_user_roles (name, description, permissions) VALUES
('admin', 'Full access to all agency functions', '{"all": true}'),
('manager', 'Can manage clients and view reports', '{"clients": {"read": true, "write": true}, "reports": {"read": true}}'),
('agent', 'Can view and manage assigned clients', '{"clients": {"read": true, "write": true}}'),
('viewer', 'Read-only access to client information', '{"clients": {"read": true}}')
ON CONFLICT (name) DO NOTHING;

-- 7. Enable Row Level Security (RLS)
ALTER TABLE uniqu.agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniqu.agency_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniqu.agency_sessions ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for agency_users
CREATE POLICY "Agency users can view their own profile" ON uniqu.agency_users
    FOR SELECT USING (id = auth.uid()::text::uuid);

CREATE POLICY "Agency users can update their own profile" ON uniqu.agency_users
    FOR UPDATE USING (id = auth.uid()::text::uuid);

CREATE POLICY "Agency admins can manage all users in their agency" ON uniqu.agency_users
    FOR ALL USING (
        agency_id IN (
            SELECT au.agency_id FROM uniqu.agency_users au
            WHERE au.id = auth.uid()::text::uuid
            AND au.role_id IN (
                SELECT id FROM uniqu.agency_user_roles WHERE name = 'admin'
            )
        )
    );

-- 9. Create RLS policies for agency_user_roles
CREATE POLICY "Anyone can view active roles" ON uniqu.agency_user_roles
    FOR SELECT USING (is_active = true);

-- 10. Create RLS policies for agency_sessions
CREATE POLICY "Agency users can view their own sessions" ON uniqu.agency_sessions
    FOR SELECT USING (agency_user_id = auth.uid()::text::uuid);

CREATE POLICY "Agency users can manage their own sessions" ON uniqu.agency_sessions
    FOR ALL USING (agency_user_id = auth.uid()::text::uuid);

-- 11. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION uniqu.update_agency_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Create triggers for updated_at
CREATE TRIGGER update_agency_users_updated_at 
    BEFORE UPDATE ON uniqu.agency_users 
    FOR EACH ROW EXECUTE FUNCTION uniqu.update_agency_updated_at_column();

CREATE TRIGGER update_agency_user_roles_updated_at 
    BEFORE UPDATE ON uniqu.agency_user_roles 
    FOR EACH ROW EXECUTE FUNCTION uniqu.update_agency_updated_at_column();

CREATE TRIGGER update_agency_sessions_updated_at 
    BEFORE UPDATE ON uniqu.agency_sessions 
    FOR EACH ROW EXECUTE FUNCTION uniqu.update_agency_updated_at_column();

-- 13. Add comments for documentation
COMMENT ON TABLE uniqu.agency_users IS 'Agency user accounts for authentication and access control';
COMMENT ON TABLE uniqu.agency_user_roles IS 'Role definitions for agency users with associated permissions';
COMMENT ON TABLE uniqu.agency_sessions IS 'Active authentication sessions for agency users';

COMMENT ON COLUMN uniqu.agency_users.role_id IS 'Reference to agency_user_roles for role-based access control';
COMMENT ON COLUMN uniqu.agency_users.email_verified IS 'Whether the email address has been verified';
COMMENT ON COLUMN uniqu.agency_users.last_login IS 'Timestamp of the last successful login';

COMMENT ON COLUMN uniqu.agency_user_roles.permissions IS 'JSON object defining the permissions for this role';
COMMENT ON COLUMN uniqu.agency_sessions.session_token IS 'Unique token for session authentication';
COMMENT ON COLUMN uniqu.agency_sessions.expires_at IS 'When the session expires and should be invalidated';
