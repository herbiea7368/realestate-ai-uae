import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { UserRole } from '../types';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName?: string;
  phone?: string;
  restricted?: boolean;
}

const users = new Map<string, StoredUser>();

const defaultAgent: StoredUser = {
  id: randomUUID(),
  email: 'agent@example.com',
  passwordHash: bcrypt.hashSync('secret12', 8),
  role: 'agent',
  displayName: 'Dubai Agent',
  restricted: false
};

users.set(defaultAgent.id, defaultAgent);

export function addUser(user: StoredUser) {
  users.set(user.id, user);
  return user;
}

export function getUser(id: string) {
  return users.get(id);
}

export function getByEmail(email: string) {
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return undefined;
}

export function updateUser(id: string, updates: Pick<StoredUser, 'displayName' | 'phone'>) {
  const current = users.get(id);
  if (!current) {
    return undefined;
  }
  const next = { ...current, ...updates };
  users.set(id, next);
  return next;
}

export function rectifyUser(
  id: string,
  updates: Partial<Pick<StoredUser, 'email' | 'displayName' | 'phone'>>
) {
  const current = users.get(id);
  if (!current) {
    return undefined;
  }
  if (updates.email && updates.email !== current.email) {
    const existing = getByEmail(updates.email);
    if (existing && existing.id !== id) {
      throw new Error('email_in_use');
    }
  }
  const next = { ...current, ...updates };
  users.set(id, next);
  return next;
}

export function anonymizeUser(id: string) {
  const current = users.get(id);
  if (!current) {
    return undefined;
  }
  const anonymizedEmail = `anonymized+${id}@example.invalid`;
  const next: StoredUser = {
    ...current,
    email: anonymizedEmail,
    displayName: undefined,
    phone: undefined,
    restricted: true
  };
  users.set(id, next);
  return next;
}

export function setUserRestriction(id: string, restricted: boolean) {
  const current = users.get(id);
  if (!current) {
    return undefined;
  }
  const next = { ...current, restricted };
  users.set(id, next);
  return next;
}

export function clearUsers() {
  users.clear();
}

export function seedDefaults() {
  if (![...users.values()].some((user) => user.email === defaultAgent.email)) {
    users.set(defaultAgent.id, defaultAgent);
  }
}

seedDefaults();

export { users };
