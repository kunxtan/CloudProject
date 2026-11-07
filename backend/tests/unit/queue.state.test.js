import { describe, expect, it } from 'vitest';
import {
  assertTransition,
  canTransition,
  estimateWaitMinutes,
  timestampPatch,
} from '../../src/services/queue.state.js';

describe('queue state machine', () => {
  it.each([
    ['waiting', 'called'],
    ['waiting', 'cancelled'],
    ['called', 'seated'],
    ['called', 'skipped'],
    ['called', 'cancelled'],
  ])('อนุญาต %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each([
    ['waiting', 'seated'],
    ['waiting', 'skipped'],
    ['called', 'waiting'],
    ['seated', 'cancelled'],
    ['cancelled', 'called'],
    ['skipped', 'called'],
  ])('ไม่อนุญาต %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrowError(expect.objectContaining({ status: 409, code: 'INVALID_TRANSITION' }));
  });

  it('บันทึกเวลาให้ตรงกับสถานะ', () => {
    const now = new Date('2026-11-07T05:00:00Z');
    expect(timestampPatch('called', now)).toEqual({ called_at: now });
    expect(timestampPatch('seated', now)).toEqual({ seated_at: now });
    expect(timestampPatch('skipped', now)).toEqual({ ended_at: now });
    expect(timestampPatch('cancelled', now)).toEqual({ ended_at: now });
  });
});

describe('estimateWaitMinutes', () => {
  it('= จำนวนคิวก่อนหน้า × เวลาเฉลี่ย', () => {
    expect(estimateWaitMinutes(0, 15)).toBe(0);
    expect(estimateWaitMinutes(3, 15)).toBe(45);
  });
  it('ไม่ติดลบ', () => {
    expect(estimateWaitMinutes(-1, 15)).toBe(0);
  });
});
