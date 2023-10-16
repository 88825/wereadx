import sql from "./db.ts";
import {calcHash} from "../utils/index.ts";


/**
 * 创建 bookid 表
 */
export async function createBookIdTable(): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS bookid (
            book_id text PRIMARY KEY,
            hash text NOT NULL
        )
    `;
}

/**
 * 插入数据
 * @param bookIds
 */
export async function insertBookIds(bookIds: string[]): Promise<void> {
    let count = 0

    for (const bookId of bookIds) {
        const hash = calcHash(bookId)
        try {
            await sql`
                    INSERT INTO bookid (book_id, hash)
                    VALUES (${bookId}, ${hash})
                `;
            console.log(++count)
        } catch (e) {
            if (e.message === 'duplicate key value violates unique constraint "bookid_pkey"') {
                // 重复插入
            } else {
                console.log(e)
            }
        }
    }
}

interface BookIdEntry {
    book_id: string
}

/**
 * 查询
 * @param hash
 */
export async function search(hash: string): Promise<string> {
    const result = await sql<BookIdEntry[]>`SELECT book_id FROM bookid WHERE hash = ${hash}`
    if (result.count === 0) {
        return ''
    } else if (result.count === 1) {
        return result[0].book_id
    }

    console.warn(result)
    throw Error(`hash(${hash}) 搜索异常`)
}
