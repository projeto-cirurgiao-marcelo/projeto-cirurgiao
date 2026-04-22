/**
 * Canonical audit action vocabulary. Strings chosen so `entity.verb` is
 * grep-friendly in logs. Only add entries here — don't free-text new
 * actions at call sites.
 */
export const AUDIT_ACTIONS = {
  COURSE_SOFT_DELETE: 'course.soft_delete',
  COURSE_RESTORE: 'course.restore',
  COURSE_PUBLISH_TOGGLED: 'course.publish_toggled',

  MODULE_SOFT_DELETE: 'module.soft_delete',
  MODULE_RESTORE: 'module.restore',

  VIDEO_SOFT_DELETE: 'video.soft_delete',
  VIDEO_RESTORE: 'video.restore',
  VIDEO_PUBLISH_TOGGLED: 'video.publish_toggled',

  USER_SOFT_DELETE: 'user.soft_delete',
  USER_RESTORE: 'user.restore',
  USER_ROLE_CHANGED: 'user.role_changed',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditEntityType = 'courses' | 'modules' | 'videos' | 'users';
