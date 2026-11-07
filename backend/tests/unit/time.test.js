import { describe, expect, it } from 'vitest';
import { addDays, businessDate, daysBetween, offsetToMinutes } from '../../src/lib/time.js';

describe('businessDate (วันของคิวตามเวลาไทย)', () => {
  it('23:30 UTC = 06:30 วันถัดไปในไทย', () => {
    expect(businessDate(new Date('2026-11-06T23:30:00Z'), '+07:00')).toBe('2026-11-07');
  });
  it('16:59 UTC = 23:59 วันเดียวกันในไทย', () => {
    expect(businessDate(new Date('2026-11-06T16:59:00Z'), '+07:00')).toBe('2026-11-06');
  });
  it('17:00 UTC = เที่ยงคืนวันใหม่ในไทย → เลขคิวเริ่มนับใหม่', () => {
    expect(businessDate(new Date('2026-11-06T17:00:00Z'), '+07:00')).toBe('2026-11-07');
  });
  it('รองรับ offset ติดลบ', () => {
    expect(businessDate(new Date('2026-11-07T02:00:00Z'), '-05:00')).toBe('2026-11-06');
  });
});

describe('date helpers', () => {
  it('offsetToMinutes', () => {
    expect(offsetToMinutes('+07:00')).toBe(420);
    expect(offsetToMinutes('-05:30')).toBe(-330);
  });
  it('addDays ข้ามเดือน/ปี', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('daysBetween', () => {
    expect(daysBetween('2026-11-01', '2026-11-07')).toBe(6);
  });
});
