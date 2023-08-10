
import fs from 'fs'
import path from 'path'

/** 获取指定文件夹下的所有文件名，和文件夹 */
export const getFilesAndFolders = (directory: string) => {
  const fNames: string[] = []
  const dNames: string[] = []
  // 读取文件夹内容
  const filenames = fs.readdirSync(directory);
  
  // 迭代文件夹内容
  filenames.forEach((filename) => {
    // 获取文件/文件夹的完整路径
    const filePath = path.join(directory, filename);
    
    // 获取文件/文件夹的状态
    const stats = fs.statSync(filePath);
    
    if (stats.isFile()) {
      fNames.push(filename)
    } else if (stats.isDirectory()) {
      dNames.push(filename)
      const { dirNames, fileNames } = getFilesAndFolders(filePath);
      dNames.push(...dirNames)
      fNames.push(...fileNames)
    }
  });

  return {
    dirNames: dNames,
    fileNames: fNames,
  }
}