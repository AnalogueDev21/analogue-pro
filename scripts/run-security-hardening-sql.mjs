import fs from 'node:fs/promises'
import pg from 'pg'

const { Client } = pg

const password = process.env.SUPABASE_DB_PASSWORD
if (!password) throw new Error('SUPABASE_DB_PASSWORD is required')

const host = process.env.SUPABASE_DB_HOST || 'db.rjswgphselvghvxjnbyu.supabase.co'
const sql = await fs.readFile(new URL('../supabase_security_hardening.sql', import.meta.url), 'utf8')

const client = new Client({
  host,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false, servername: host },
})

await client.connect()
try {
  await client.query(sql)
  const { rows } = await client.query(`
    select
      (select relrowsecurity from pg_class where relname = 'employees') as employees_rls,
      (select relrowsecurity from pg_class where relname = 'leave_requests') as leave_requests_rls,
      (select relrowsecurity from pg_class where relname = 'ot_requests') as ot_requests_rls,
      (select relrowsecurity from pg_class where relname = 'payslips') as payslips_rls,
      (select relrowsecurity from pg_class where relname = 'notifications') as notifications_rls,
      (select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'employees'
          and column_name = 'pin'
      )) as plaintext_pin_column_exists
  `)
  console.log(JSON.stringify(rows[0], null, 2))
} finally {
  await client.end()
}
