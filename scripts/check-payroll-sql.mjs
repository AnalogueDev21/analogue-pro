import pg from 'pg'

const { Client } = pg
const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT || 6543),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false, servername: process.env.SUPABASE_DB_HOST },
})

await client.connect()
try {
  const { rows } = await client.query(`
    select
      (select to_regclass('public.payroll_imports')::text) as payroll_imports,
      (select to_regclass('public.payroll_import_rows')::text) as payroll_import_rows,
      (select count(*)::int from permissions where code in ('payroll.import','payroll.export')) as permissions,
      (
        select count(*)::int
        from role_permissions rp
        join permissions p on p.id = rp.permission_id
        where p.code in ('payroll.import','payroll.export')
      ) as role_permissions
  `)
  console.log(JSON.stringify(rows[0], null, 2))
} finally {
  await client.end()
}
