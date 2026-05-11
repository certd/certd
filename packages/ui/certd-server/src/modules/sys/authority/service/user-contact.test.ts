/// <reference types="mocha" />

import assert from 'node:assert/strict';
import { Not } from 'typeorm';
import { buildUserContactConflictWhere } from './user-service.js';

describe('buildUserContactConflictWhere', () => {
  it('checks username, mobile and email conflicts except current user', () => {
    const where = buildUserContactConflictWhere('user@example.com', 12);

    assert.deepEqual(where, [
      { username: 'user@example.com', id: Not(12) },
      { mobile: 'user@example.com', id: Not(12) },
      { email: 'user@example.com', id: Not(12) },
    ]);
  });

  it('trims contact value before building conflict query', () => {
    const where = buildUserContactConflictWhere(' 13800138000 ', 3);

    assert.deepEqual(where, [
      { username: '13800138000', id: Not(3) },
      { mobile: '13800138000', id: Not(3) },
      { email: '13800138000', id: Not(3) },
    ]);
  });
});
