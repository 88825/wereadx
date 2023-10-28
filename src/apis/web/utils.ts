interface BookType {
    type: string
    showType: boolean
    translateDone: boolean
    translateStatus: string
}

interface BookInfo {
    otherType: BookType[]
    format: string
}

export class M278 {
    static isEpub(bookInfo: BookInfo) {
        return this.actualTreatBookFormatAs(bookInfo) === 'epub'
    }

    static actualTreatBookFormatAs(bookInfo: BookInfo): string | null {
        if (this.hasOtherType(bookInfo) && this.showOtherType(bookInfo)) {
            return this.otherType(bookInfo)
        } else {
            return bookInfo.format
        }
    }

    static hasOtherType(bookInfo: BookInfo): boolean {
        return bookInfo && bookInfo.otherType && bookInfo.otherType.length > 0
    }

    static otherType(bookInfo: BookInfo): string | null {
        if (this.hasOtherType(bookInfo)) {
            return bookInfo.otherType[0].type
        } else {
            return null
        }
    }

    static showOtherType(bookInfo: BookInfo) {
        if (this.otherType(bookInfo)) {
            return bookInfo.otherType[0].showType
        } else {
            return false
        }
    }
}
