
import fs from 'fs'
import https from 'https'
import signale, { Signale } from 'signale'

interface OptionProps {
  beforeStart?(): void
  onStart?(size: number): void
  onError?(error: Error): void
  onSuccess?(): void
  onProgress?(rate: string, totalSize: number, downloadedSize: number): void
}

export const download = (url: string, savePath: string, options?: OptionProps) => {
  const { beforeStart, onStart, onSuccess, onProgress, onError } = options || {}
  return new Promise(resolve => {
    beforeStart && beforeStart()
    https.get(url, response => {
      const fileStream = fs.createWriteStream(savePath);
      response.pipe(fileStream);
      let downloadedSize = 0;
      const totalSize = parseInt(response.headers['content-length']!);
      onStart && onStart(totalSize)
      response.on('data', chunk => {
        downloadedSize += chunk.length;
        const progress = downloadedSize / totalSize;
        const rate = `${(progress * 100).toFixed(2)}%`
        onProgress && onProgress(rate, totalSize, downloadedSize)
      });
    
      response.on('end', () => {
        onSuccess && onSuccess()
        resolve(true)
      });

      response.on('error', err => {
        onError && onError(err)
        resolve(false)
      });
    })
  })
}

export const downloadWithLog = async (url: string, savePath: string, options?: OptionProps & {
  title?: string
  successSuffix?: string
}) => {
  let startTime = new Date().getTime()
  const { title = url, successSuffix, beforeStart, onStart, onProgress, onError, onSuccess } = options || {}
  const interactive = new Signale({ interactive: true, scope: title });

  return await download(url, savePath, {
    beforeStart() {
      beforeStart && beforeStart()
      startTime = new Date().getTime()
    },
    onStart(size: number) {
      onStart && onStart(size)
      const sizeM = (size / 1024 / 1024).toFixed(3)
      signale.start({
        prefix: `[${title}]`,
        message: `开始下载 ${sizeM}M`
      })
    },
    onProgress(progress, totalSize, downloadedSize) {
      onProgress && onProgress(progress, totalSize, downloadedSize)
      const endTime = new Date().getTime()
      const time = (endTime - startTime) / 1000
      const totalSizeM = (totalSize / 1024 / 1024).toFixed(3)
      const downloadedSizeM = (downloadedSize / 1024 / 1024).toFixed(3)
      const message = `${downloadedSizeM}M / ${totalSizeM}M 【${progress} / ${time}s】`
      interactive.watch(message)
    },
    onSuccess() {
      onSuccess && onSuccess()
      const endTime = new Date().getTime()
      const time = (endTime - startTime) / 1000
      signale.success({
        message: `${title} ${time}s`,
        suffix: successSuffix
      })
    },
    onError(error) {
      onError && onError(error)
      signale.error(error)
    }
  })
}

/** 爬取 html 数据 */
export const getHtml = (url: string): Promise<string> => {
	return new Promise(resolve => {
		https.get(url, res => {
			let html = '';
			/** 重定向后重新获取 html */
			if (res.statusCode === 301 || res.statusCode === 302) {
				const redirectUrl = res.headers.location || "";
				getHtml(redirectUrl).then(resolve)
				return
			}
			// 有数据产生的时候 拼接
			res.on('data', chunk => {
				html += chunk;
			})
			// 拼接完成
			res.on('end', function () {
				resolve(html)
			})
		});
	})
}