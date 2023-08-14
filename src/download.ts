
import fs from 'fs'
import https from 'https'
import signale, { Signale } from 'signale'

interface OptionProps {
  beforeStart?(): void
  onStart?(size: number): void
  onError?(error: Error): void
  onSuccess?(rate: string): void
  onProgress?(rate: string, totalSize: number, downloadedSize: number): void
  allowSize?: number
}

export const download = (url: string, savePath: string, options?: OptionProps) => {
  const { beforeStart, onStart, onSuccess, onProgress, onError, allowSize = 100 } = options || {}
  return new Promise(resolve => {
    beforeStart && beforeStart()
    https.get(url, response => {
      const fileStream = fs.createWriteStream(savePath);
      response.pipe(fileStream);
      let downloadedSize = 0;
      const totalSize = parseInt(response.headers['content-length']!);
      onStart && onStart(totalSize)

      let rate = ""
      response.on('data', chunk => {
        downloadedSize += chunk.length;
        const progress = downloadedSize / totalSize;
        rate = (progress * 100).toFixed(2)
        onProgress && onProgress(rate, totalSize, downloadedSize)
      });

      let lastRate = ""
      let stopCount = 0
      const timer = setInterval(() => {
        if (allowSize === 100) return
        if (lastRate !== rate) {
          lastRate = rate
          stopCount = 0
          return
        }
        if (Number(rate) > allowSize) {
          stopCount += 1
        }
        if (stopCount > 5) {
          clearInterval(timer)
          onSuccess && onSuccess(rate)
          resolve(true)
        }
      }, 5 * 1000)
    
      response.on('end', () => {
        clearInterval(timer)
        onSuccess && onSuccess(rate)
        resolve(true)
      });

      response.on('error', err => {
        clearInterval(timer)
        onError && onError(err)
        resolve(false)
      });
    })
  })
}

export const downloadWithLog = async (url: string, savePath: string, options?: OptionProps & {
  rate?: () => string | string
  title?: string
  successSuffix?: string
}) => {
  let startTime = new Date().getTime()
  const { rate: downloadRate, title = url, successSuffix, beforeStart, onStart, onProgress, onError, onSuccess } = options || {}
  const interactive = new Signale({ interactive: true, scope: title });

  return await download(url, savePath, {
    ...options,
    beforeStart() {
      beforeStart && beforeStart()
      startTime = new Date().getTime()
    },
    onStart(size: number) {
      onStart && onStart(size)
      const sizeM = (size / 1024 / 1024).toFixed(3)
      signale.start({
        message: "开始下载",
        suffix: `${title} - ${sizeM}M`
      })
    },
    onProgress(rate, totalSize, downloadedSize) {
      onProgress && onProgress(rate, totalSize, downloadedSize)
      const endTime = new Date().getTime()
      const time = (endTime - startTime) / 1000
      const totalSizeM = (totalSize / 1024 / 1024).toFixed(3)
      const downloadedSizeM = (downloadedSize / 1024 / 1024).toFixed(3)
      const message = `${downloadedSizeM}M / ${totalSizeM}M 【${rate}% / ${time}s】`
      interactive.watch(message)
    },
    onSuccess(rate) {
      onSuccess && onSuccess(rate)
      const suffix = typeof downloadRate === "function" ? downloadRate(): downloadRate
      signale.success({
        suffix,
        message: title,
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