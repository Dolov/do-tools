
import fs from 'fs'
import https from 'https'
import signale, { Signale } from 'signale'

interface OptionProps {
  init?(): void
  onError?(error: Error): void
  onSuccess?(): void
  onProgress?(val: string): void
}

export const download = (url: string, savePath: string, options?: OptionProps) => {
  const { init, onSuccess, onProgress, onError } = options || {}
  return new Promise(resolve => {
    init && init()
    https.get(url, response => {
      const fileStream = fs.createWriteStream(savePath);
      response.pipe(fileStream);
      let downloadedBytes = 0;
      const totalSize = parseInt(response.headers['content-length']!);
      response.on('data', chunk => {
        downloadedBytes += chunk.length;
        const progress = downloadedBytes / totalSize;
        const val = `${(progress * 100).toFixed(2)}%`
        onProgress && onProgress(val)
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

export const downloadWithLog = async (url: string, savePath: string, options?: {
  title?: string
  successSuffix?: string
}) => {
  const { title = url, successSuffix } = options || {}
  let startTime = new Date().getTime()
  const interactive = new Signale({ interactive: true, scope: title });
  return await download(url, savePath, {
    init() {
      startTime = new Date().getTime()
      signale.await({
        prefix: `[${title}]`,
        message: `准备下载`
      })
    },
    onProgress(progress) {
      interactive.watch(progress)
    },
    onSuccess() {
      const endTime = new Date().getTime()
      const time = (endTime - startTime) / 1000
      signale.success({
        message: `${title} ${time}s`,
        suffix: successSuffix
      })
    },
    onError(error) {
      signale.error(error)
    }
  })
}