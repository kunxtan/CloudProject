/**
 * Schema เริ่มต้น
 * กติกา: migration ต้อง backward compatible (เพิ่มได้, ห้ามลบ/rename ในรอบเดียวกัน)
 * เพราะระหว่าง rolling deploy โค้ดเก่าและใหม่จะรันพร้อมกัน
 */

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('name', 100).notNullable();
    t.string('phone', 20).nullable();
    t.enu('role', ['customer', 'staff', 'owner']).notNullable().defaultTo('customer');
    t.integer('restaurant_id').unsigned().nullable(); // staff/owner → ร้านที่สังกัด
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('restaurants', (t) => {
    t.increments('id');
    t.integer('owner_id').unsigned().notNullable().unique().references('id').inTable('users');
    t.string('name', 150).notNullable();
    t.text('description').nullable();
    t.string('address', 255).nullable();
    t.string('cover_image_key', 255).nullable(); // เก็บ S3 key ไม่ใช่ URL
    t.string('logo_key', 255).nullable();
    t.boolean('is_open').notNullable().defaultTo(true);
    t.integer('avg_service_minutes').unsigned().notNullable().defaultTo(15);
    t.integer('near_threshold').unsigned().notNullable().defaultTo(3);
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['name']);
  });

  await knex.schema.alterTable('users', (t) => {
    t.foreign('restaurant_id').references('id').inTable('restaurants').onDelete('SET NULL');
  });

  await knex.schema.createTable('restaurant_tables', (t) => {
    t.increments('id');
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.string('label', 20).notNullable();
    t.integer('capacity').unsigned().notNullable();
    t.enu('status', ['available', 'occupied', 'cleaning']).notNullable().defaultTo('available');
    t.unique(['restaurant_id', 'label']);
  });

  // ตัวนับเลขคิวต่อร้านต่อวัน — ออกเลขแบบ atomic ด้วย LAST_INSERT_ID() (ดู queue.repository.js)
  await knex.schema.createTable('queue_counters', (t) => {
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.date('queue_date').notNullable();
    t.integer('last_number').unsigned().notNullable();
    t.primary(['restaurant_id', 'queue_date']);
  });

  await knex.schema.createTable('queues', (t) => {
    t.increments('id');
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.integer('customer_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('queue_date').notNullable();
    t.integer('queue_number').unsigned().notNullable();
    t.integer('party_size').unsigned().notNullable();
    t.enu('status', ['waiting', 'called', 'seated', 'skipped', 'cancelled']).notNullable().defaultTo('waiting');
    t.integer('table_id').unsigned().nullable().references('id').inTable('restaurant_tables').onDelete('SET NULL');
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.datetime('called_at').nullable();
    t.datetime('seated_at').nullable();
    t.datetime('ended_at').nullable();
    t.unique(['restaurant_id', 'queue_date', 'queue_number']);
    t.index(['restaurant_id', 'queue_date', 'status'], 'queues_restaurant_date_status_idx'); // query ที่ถูก poll บ่อยสุด
    t.index(['customer_id', 'status']);
  });

  await knex.schema.createTable('notifications', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('queue_id').unsigned().notNullable().references('id').inTable('queues').onDelete('CASCADE');
    t.enu('type', ['near', 'ready']).notNullable();
    t.string('message', 255).notNullable();
    t.boolean('is_read').notNullable().defaultTo(false);
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['queue_id', 'type']); // กันแจ้งเตือนซ้ำ
    t.index(['user_id', 'is_read']);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('queues');
  await knex.schema.dropTableIfExists('queue_counters');
  await knex.schema.dropTableIfExists('restaurant_tables');
  await knex.schema.alterTable('users', (t) => t.dropForeign('restaurant_id'));
  await knex.schema.dropTableIfExists('restaurants');
  await knex.schema.dropTableIfExists('users');
}
