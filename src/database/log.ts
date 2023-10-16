import sql from "./db.ts";


/**
 * 创建 log 表
 */
export async function createTable(): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS log (
            id serial PRIMARY KEY,
            subhoster_id text,
            deployment_id text NOT NULL,
            isolate_id text NOT NULL,
            region text NOT NULL,
            level text NOT NULL,
            timestamp timestamptz NOT NULL,
            message text NOT NULL,
            hash text NOT NULL,
            UNIQUE(hash)
        )
    `;
}


interface LogRecord {
    subhoster_id: string
    deployment_id: string
    isolate_id: string
    region: string
    level: string
    timestamp: string
    message: string
    hash: string
}

/**
 * 插入数据
 * @param records
 */
export async function insertLogRecords(records: LogRecord[]): Promise<void> {
    await createTable()

    for (const record of records) {
        try {
            await sql`insert into log ${sql(record)}`;
        } catch (e) {
            if (e.message === 'duplicate key value violates unique constraint "log_hash_key"') {
                // 重复插入
            } else {
                console.warn(e)
            }
        }
    }
}
