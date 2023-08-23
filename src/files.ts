
import fs from 'fs'
import path from 'path'
import { endWithNumber } from './reg'

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

/** 递增名称 */
export const increName = (name: string, names: string[]): string => {
  const exist = names.includes(name)
  if (!exist) return name
  const match = name.match(endWithNumber);
  if (match) {
    const number = parseInt(match[0]);
    // 递增数字
    const incrementedNumber = number + 1;
    // 将递增的数字替换字符串末尾的数字并返回新的字符串
    const newName = name.replace(endWithNumber, `${incrementedNumber}`);
    return increName(newName, names)
  }
  return increName(`${name}2`, names)
}

interface FileStatTreeProps {
  size: number,
  name: string,
  path: string,
  birthtime: Date,
  leaf: boolean,
  children?: FileStatTreeProps[]
}

/**
 * 获取指定文件夹下的文件状态树
 * @param directory 文件夹路径
 * @returns 文件状态树
 */
export const getFileStatTree = (directory: string): FileStatTreeProps[] => {
  const files = fs.readdirSync(directory)
  
  return files.reduce((currentValue: FileStatTreeProps[], currentItem) => {
    const filePath = `${directory}/${currentItem}`
    const stat = fs.statSync(filePath)
    const isFile = stat.isFile()
    const { size, birthtime } = stat
    const fileStat: FileStatTreeProps = {
      size,
      birthtime,
      name: currentItem,
      path: filePath,
      leaf: isFile,
    }
    
    if (!isFile) {
      fileStat.children = getFileStatTree(filePath)
    }

    currentValue.push(fileStat)
    return currentValue
  }, [])
}
