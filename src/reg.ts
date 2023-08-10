
/**
 * @fileoverview 常用的正则
 */

/** 过滤 /api/ 接口 */
export const api = /\/api\/([a-z|0-9|A-Z|\/|-]*)/g;

/** 数字结尾 */
export const endWithNumber = /\d+$/

/** 匹配 esm 导出的函数名 */
export const exportFunc = /export\s+(?:function|const|let|const)\s+(\w+)\s*(?:\(|=)/g;