import { conflict } from '../utils/AppError.js';

/**
 * Queue state machine
 *
 *            call            seat
 *  waiting ───────▶ called ───────▶ seated
 *     │                │
 *     │ cancel         │ skip / cancel
 *     ▼                ▼
 *  cancelled      skipped / cancelled
 */
export const TRANSITIONS = Object.freeze({
  waiting: ['called', 'cancelled'],
  called: ['seated', 'skipped', 'cancelled'],
  seated: [],
  skipped: [],
  cancelled: [],
});

export const STATUS_LABELS = Object.freeze({
  waiting: 'รอคิว',
  called: 'เรียกแล้ว',
  seated: 'ได้โต๊ะแล้ว',
  skipped: 'ข้ามคิว',
  cancelled: 'ยกเลิก',
});

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw conflict(
      `ไม่สามารถเปลี่ยนสถานะคิวจาก "${STATUS_LABELS[from] ?? from}" เป็น "${STATUS_LABELS[to] ?? to}" ได้`,
      'INVALID_TRANSITION',
    );
  }
}

/** คอลัมน์เวลาที่ต้องบันทึกเมื่อเปลี่ยนเป็นสถานะนั้น */
export function timestampPatch(to, now = new Date()) {
  switch (to) {
    case 'called':
      return { called_at: now };
    case 'seated':
      return { seated_at: now };
    case 'skipped':
    case 'cancelled':
      return { ended_at: now };
    default:
      return {};
  }
}

/** เวลารอโดยประมาณ (นาที) = จำนวนคิวก่อนหน้า × เวลาบริการเฉลี่ยต่อคิว */
export function estimateWaitMinutes(ahead, avgServiceMinutes) {
  return Math.max(0, ahead) * Math.max(0, avgServiceMinutes);
}
