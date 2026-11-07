/**
 * รูปโปรไฟล์ผู้ใช้ — เก็บเป็น storage key (เหมือนรูปร้าน) ไม่ใช่ URL
 * เพิ่มคอลัมน์แบบ nullable → โค้ดเวอร์ชันเก่าที่ยังรันอยู่ระหว่าง rolling deploy ไม่พัง
 */

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('avatar_key', 255).nullable().after('phone');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('users', (t) => t.dropColumn('avatar_key'));
}
