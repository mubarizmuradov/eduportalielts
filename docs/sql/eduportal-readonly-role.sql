-- EduPortal IELTS -> EduPortal read-only access
-- Run ONCE on the EduPortal PostgreSQL server as a superuser / database owner.
-- It creates a login role that can only SELECT the tables EduPortal IELTS reads.
-- It changes no EduPortal table, column or data.
--
-- psql "$EDUPORTAL_ADMIN_URL" -v ro_password="'a-strong-password'" -f eduportal-readonly-role.sql

CREATE ROLE eduielts_readonly LOGIN PASSWORD :ro_password
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

-- Defence in depth: every transaction opened by this role is read-only.
ALTER ROLE eduielts_readonly SET default_transaction_read_only = on;
ALTER ROLE eduielts_readonly SET statement_timeout = '5s';
ALTER ROLE eduielts_readonly CONNECTION LIMIT 20;

DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO eduielts_readonly', current_database()); END $$;
GRANT USAGE ON SCHEMA public TO eduielts_readonly;

-- Only the columns EduPortal IELTS uses (column-level grants). EduPortal IELTS signs users in
-- through EduPortal SSO only, so password hashes and 2FA secrets stay unreadable.
GRANT SELECT (id, email, first_name, last_name, avatar_url, language, role, is_temp, deleted_at)
  ON users TO eduielts_readonly;
GRANT SELECT (id, user_id, expires_at) ON sessions TO eduielts_readonly;
GRANT SELECT (id, name, logo_url, deleted_at) ON academies TO eduielts_readonly;
GRANT SELECT (id, academy_id, name, deleted_at) ON campuses TO eduielts_readonly;
GRANT SELECT (id, academy_id, campus_id, title, status, deleted_at) ON classes TO eduielts_readonly;
GRANT SELECT (id, academy_id, user_id, "academyRole", status, deleted_at) ON academy_users TO eduielts_readonly;
GRANT SELECT (id, user_id, campus_id, academy_id, "campusRole", status, deleted_at) ON user_campuses TO eduielts_readonly;
GRANT SELECT (id, class_id, user_id, academy_id, campus_id, "classRole", status, deleted_at) ON class_users TO eduielts_readonly;
