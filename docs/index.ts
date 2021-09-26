
import path from 'path'
import getDirFilesContent, { CallbackParams } from '../lib/getDirFilesContent'

getDirFilesContent(path.resolve(__dirname, '../src'), (params: CallbackParams) => {
  console.log('file: ', params.fileName);
  console.log('file: ', params.filePath);
})
