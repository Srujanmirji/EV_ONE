-- Development rollback only; drops authorization state and audit evidence.
-- Production recovery must preserve audit records and use a forward repair.
DROP TABLE audit_events;
DROP FUNCTION refuse_audit_mutation();
DROP TABLE role_assignments;
DROP TABLE users;
DROP TYPE "AuditOutcome";
DROP TYPE "AuditAction";
DROP TYPE "AccessScope";
DROP TYPE "RoleScope";
DROP TYPE "AppRole";
DROP TYPE "UserStatus";
