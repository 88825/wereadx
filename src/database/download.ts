import sql from "./db.ts";


/**
 * 创建 download 表
 */
export async function createTable(): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS download (
            id serial PRIMARY KEY,
            vid text NOT NULL,
            book_id text NOT NULL,
            timestamp timestamp NOT NULL
        )
    `;
}


export interface DownloadRecord {
    vid: string
    book_id: string
    timestamp: string
}

/**
 * 插入数据
 * @param records
 */
export async function insertDownloadRecords(records: DownloadRecord[]): Promise<void> {
    await createTable()

    for (const record of records) {
        try {
            await sql`insert into download ${sql(record)}`;
        } catch (e) {
            if (e.message === 'duplicate key value violates unique constraint "bookid_pkey"') {
                // 重复插入
            } else {
                console.warn(e)
            }
        }
    }
}
