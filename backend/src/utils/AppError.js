/** Error ที่ตั้งใจโยนเพื่อตอบ client (message เป็นภาษาไทยแสดงบน UI ได้เลย) */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, code = 'BAD_REQUEST') => new AppError(400, code, message);
export const unauthorized = (message = 'กรุณาเข้าสู่ระบบ', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);
export const forbidden = (message = 'คุณไม่มีสิทธิ์ทำรายการนี้', code = 'FORBIDDEN') =>
  new AppError(403, code, message);
export const notFound = (message = 'ไม่พบข้อมูล', code = 'NOT_FOUND') => new AppError(404, code, message);
export const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);
