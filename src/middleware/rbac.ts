import { type Request, type Response, type NextFunction } from 'express';
import { db, users } from '../db/index';
import { eq } from 'drizzle-orm';

// Permission → which roles are allowed
// `team_lead` sits between sales and admin: full operational access (Contacts,
// Pipeline, Tasks, Meta Ads, Outreach, AI Intelligence, Growth OS, Templates,
// Lead Discovery, Short Links) but NOT financial/security tools (Billing,
// Permissions, Audit, Pipeline Manager, SEO, Analytics).
const PERMISSION_MAP: Record<string, string[]> = {
  CONTACTS_VIEW:       ['admin', 'manager_ops', 'team_lead', 'sales'],
  CONTACTS_EXPORT:     ['admin'],
  CONTACTS_BULK_DELETE: ['admin'],
  DEALS_VIEW:          ['admin', 'manager_ops', 'team_lead', 'sales'],
  DEALS_EDIT:          ['admin', 'manager_ops', 'team_lead', 'sales'],
  QUALIFICATION_VIEW:  ['admin', 'manager_ops', 'team_lead', 'sales'],
  SEQUENCES_VIEW:      ['admin', 'manager_ops', 'team_lead', 'sales'],
  SEQUENCES_EDIT:      ['admin', 'manager_ops', 'team_lead'],
  AUTOMATIONS_VIEW:    ['admin', 'manager_ops', 'team_lead', 'sales'],
  AUTOMATIONS_EDIT:    ['admin', 'manager_ops', 'team_lead'],
  ADS_VIEW:            ['admin', 'manager_ads', 'team_lead'],
  ADS_MANAGE:          ['admin', 'manager_ads', 'team_lead'],
  REPORTS_VIEW:        ['admin', 'manager_ops', 'manager_ads'],
  SOCIAL_VIEW:         ['admin', 'manager_ops', 'team_lead', 'staff'],
  SOCIAL_POST:         ['admin', 'manager_ops', 'team_lead', 'staff'],
  INBOX_VIEW:          ['admin', 'manager_ops', 'team_lead', 'sales'],
  BILLING_VIEW:        ['admin'],
  HEALTH_VIEW:         ['admin', 'manager_ops', 'team_lead', 'sales'],
  PERMISSIONS_VIEW:    ['admin'],
  AUDIT_VIEW:          ['admin'],
  MARKETING_VIEW:      ['admin', 'manager_ads'],
  MARKETING_MANAGE:    ['admin', 'manager_ads'],
  DISCOVERY_VIEW:      ['admin', 'manager_ops', 'team_lead', 'sales'],
};

// Roles that get admin-tier operational tools (Outreach, AI Intelligence,
// Growth OS) — gated separately from PERMISSION_MAP because these are
// inline-checked in route handlers rather than via requirePermission.
export const ADMIN_TIER_ROLES = ['admin', 'team_lead'];
export function isAdminTier(role: string | undefined): boolean {
  return ADMIN_TIER_ROLES.includes(role || '');
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role || 'staff';
    if (roles.includes(role)) {
      next();
    } else {
      res.status(403).json({ error: 'forbidden', message: "You don't have permission to access this resource" });
    }
  };
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role || 'staff';
    const allowed = PERMISSION_MAP[permission];
    if (!allowed) { next(); return; }
    if (allowed.includes(role)) {
      next();
    } else {
      res.status(403).json({ error: 'forbidden', message: "You don't have permission to access this resource" });
    }
  };
}

// Check permission from role string directly (for use in route handlers)
export function hasPermission(role: string, permission: string): boolean {
  const allowed = PERMISSION_MAP[permission];
  if (!allowed) return true;
  return allowed.includes(role);
}

// Data masking for staff role
export function maskContactData(role: string, contact: Record<string, unknown>): Record<string, unknown> {
  if (role !== 'staff') return contact;
  const masked = { ...contact };
  if (masked.phone && typeof masked.phone === 'string') {
    masked.phone = masked.phone.slice(0, -3).replace(/\d/g, 'x') + masked.phone.slice(-3);
  }
  if (masked.email && typeof masked.email === 'string') {
    const [local, domain] = (masked.email as string).split('@');
    masked.email = local.slice(0, 2) + '***@' + domain;
  }
  return masked;
}
