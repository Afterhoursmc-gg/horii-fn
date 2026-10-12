import 'dotenv/config';import pg from 'pg';import fs from 'node:fs';import path from 'node:path';
const {Pool}=pg; const db=new Pool({connectionString:process.env.DATABASE_URL});
await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
const dir=path.resolve('packages/database/migrations');
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()){const done=await db.query('SELECT 1 FROM schema_migrations WHERE id=$1',[f]); if(done.rowCount) continue; const sql=fs.readFileSync(path.join(dir,f),'utf8'); await db.query('BEGIN'); try{await db.query(sql); await db.query('INSERT INTO schema_migrations(id) VALUES($1)',[f]); await db.query('COMMIT'); console.log('applied',f)}catch(e){await db.query('ROLLBACK'); throw e}}
await db.end();
