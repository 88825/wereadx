import sql from "./db.ts";


/**
 * 创建 errlog 表
 */
export async function createTable(): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS errlog (
            id serial PRIMARY KEY,
            user text NOT NULL,
            errCode text NOT NULL,
            errMsg text NOT NULL,
            timestamp timestamp NOT NULL
        )
    `;
}


export interface ErrLogRecord {
    user: string
    errCode: number
    errMsg: string
    timestamp: string
}

/**
 * 插入数据
 * @param records
 */
export async function insertErrLogRecords(records: ErrLogRecord[]): Promise<void> {
    await createTable()

    for (const record of records) {
        try {
            await sql`insert into errlog ${sql(record)}`;
        } catch (e) {
            if (e.message === 'duplicate key value violates unique constraint "errlog_id_pkey"') {
                // 重复插入
            } else {
                console.warn(e)
            }
        }
    }
}
