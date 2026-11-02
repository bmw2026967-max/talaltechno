import type { Role } from '@talaltechno/shared-types';

export interface AuthUser {
  sub: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
}
