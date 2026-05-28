import fs from 'node:fs/promises'
import pg from 'pg'

const { Client } = pg

const password = process.env.SUPABASE_DB_PASSWORD
if (!password) throw new Error('SUPABASE_DB_PASSWORD is required')

const sql = await fs.readFile(new URL('../supabase_phase3_4.sql', import.meta.url), 'utf8')
const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.rjswgphselvghvxjnbyu.supabase.co',
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false, servername: 'db.rjswgphselvghvxjnbyu.supabase.co' },
})

await client.connect()
try {
  await client.query(sql)
  const { rows } = await client.query(`
    select
      (select count(*)::int from leave_types) as leave_types,
      (select relrowsecurity from pg_class where relname = 'leave_types') as leave_types_rls,
      (select relrowsecurity from pg_class where relname = 'leave_requests') as leave_requests_rls,
      (select relrowsecurity from pg_class where relname = 'ot_requests') as ot_requests_rls
  `)
  console.log(JSON.stringify(rows[0], null, 2))
} finally {
  await client.end()
}
