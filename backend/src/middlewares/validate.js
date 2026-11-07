import { AppError } from '../utils/AppError.js';

/**
 * ตรวจ input ด้วย zod schema แล้วเก็บค่าที่ผ่านการแปลงแล้วไว้ใน req.valid
 * (Express 5 ห้ามเขียนทับ req.query จึงใช้ req.valid แทน)
 *
 * ตัวอย่าง: validate({ params: idParams, body: createSchema })
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = req.valid ?? {};
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ path: [part, ...i.path].join('.'), message: i.message }));
        throw new AppError(400, 'VALIDATION_ERROR', details[0]?.message ?? 'ข้อมูลไม่ถูกต้อง', details);
      }
      req.valid[part] = result.data;
    }
    next();
  };
}
