import pg from 'pg';import Redis from 'ioredis'; const {Pool}=pg;
const RedisCtor:any=Redis;
export const pool=new Pool({connectionString:process.env.DATABASE_URL}); export const redis=new RedisCtor(process.env.REDIS_URL||'redis://127.0.0.1:56379');
export async function q<T extends pg.QueryResultRow=any>(text:string, params:any[]=[]){return (await pool.query<T>(text,params)).rows}
