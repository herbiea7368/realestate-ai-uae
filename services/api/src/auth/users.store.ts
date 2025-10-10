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
}

const users = new Map<string, StoredUser>();

const defaultAgent: StoredUser = {
  id: randomUUID(),
  email: 'agent@example.com',
  passwordHash: bcrypt.hashSync('secret12', 8),
  role: 'agent',
  displayName: 'Dubai Agent'
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
