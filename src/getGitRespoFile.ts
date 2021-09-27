
import fs from 'fs'
import { execSync } from 'child_process'

const getRespoName = (url: string) => {
  const s = url.split('/')
  const [name] = s[s.length - 1].split('.git')
  return name
}

/**
 * 获取 git 仓库中的指定文件
 * @param url 
 * @param params 
 */
const getGitRespoFile = (url: string, params?: {
  branch?: string;
  filePath?: string;
}) => {
  const { branch = 'master', filePath } = params || {}
  const respoName = getRespoName(url)
  const tempRespoName = `${__dirname}/__${respoName}`
  if (!filePath) return ''
  console.log(`开始克隆远程 ${branch} 分支代码`)
  execSync(`git clone --depth=1 -b ${branch} ${url} ${tempRespoName}`)
  console.log(`克隆成功，开始读取 ${filePath} 文件`)
  const file = fs.readFileSync(`${tempRespoName}/${filePath}`, 'utf-8')
  console.log(`文件读取成功，删除项目文件`)
  execSync(`rm -rf ${tempRespoName}`)
  return file
}


/** 生成新的 package.json 内容 */
const getNewPackageJson = (targetPackageJson: string) => {
  let tPackageJson: Record<string, any> = {}
  if (typeof targetPackageJson === 'string') {
    tPackageJson = JSON.parse(targetPackageJson)
  }
  const currentPath = `${process.cwd()}/package.json`
  const file = fs.readFileSync(currentPath, 'utf-8')
  const packageJson =  JSON.parse(file)
  const depes = ["dependencies", "devDependencies", "resolutions", "peerDependencies"]
  console.log('开始进行版本合并');
  depes.forEach(depeName => {
    const ds = packageJson[depeName] || {}
    Object.keys(ds).forEach(npmName => {
      const tVersion = tPackageJson[depeName]?.[npmName]
      const cVersion = packageJson[depeName]?.[npmName]
      if (!tVersion) return
      if (cVersion !== tVersion) {
        console.log(`${npmName}: ${cVersion} =================================> ${tVersion}`);
        packageJson[depeName][npmName] = tVersion
      }
    })
  })
  console.log('合并完成，开始覆盖当前 package.json 配置');
  fs.writeFileSync(currentPath, JSON.stringify(packageJson, null, 2))
  return packageJson
}



// const targetPackageJson = getGitRespoFile('https://gitee.com/scfe/app.git', {
//   branch: 'prod-beta',
//   filePath: 'package.json'
// })

// const newPackageJson = getNewPackageJson(targetPackageJson)