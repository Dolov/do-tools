
import fs from 'fs'
import path from 'path'

export interface CallbackParams {
	file: string;
	fileName: string;
	filePath: string;
}

/**
 * 获取指定目录下的文件内容
 * @param dirPath 文件夹名称
 * @param callback 读取到每个文件后的回调
 */
const getDirFileContent = (dirPath: string, callback: (file: CallbackParams) => void) => {
	fs.readdir(dirPath, (err, files) => {
		if (err) {
			console.warn(err)
			return
		}

		files.forEach((fileName: string) => {
			const filePath = path.join(dirPath, fileName)
			fs.stat(filePath, (err, stats) => {
				if (err) {
					console.warn(err)
					return
				}
				/** 文件 */
				const isFile = stats.isFile()
				/** 文件夹 */
				const isDir = stats.isDirectory()
				if (isFile) {
					const content = fs.readFileSync(filePath, 'utf-8')
					callback({
						filePath,
						file: content,
						fileName: fileName,
					})
					return
				}
				if (isDir) {
					getDirFileContent(filePath, callback)
				}
			})
		})
	})
}

export default getDirFileContent

