/**
 * @fileoverview 封装常用的 git 操作
 */

const { spawnSync } = require('child_process');

/**
 * 检查工作区状态
 */
export const gitWorkspaceStatus = (): string | null => {
  /** 检查工作区状态 */
  const workspaceStatus = spawnSync('git', ['status', '--porcelain'])

  /** 工作区存在数据 */
  if (workspaceStatus.stdout.length) {
    return workspaceStatus.stdout.toString()
  }
  return null
}

/**
 * 检查暂存区状态
 */
export const getStageStatus = (): string | null => {
  const stageStatus = spawnSync('git', ['cherry', '-v'])
  if (stageStatus.stdout.length) {
    return stageStatus.stdout.toString()
  }
  return null
}


/**
 * 获取最后的提交信息
 */
export const getLastCommitMessage = (): {
  date: string;
  author: string;
  commit: string;
} | null => {
  const gitLastLog = spawnSync('git', ['log', '-1'])
  if (gitLastLog.stdout.length) {
    const log =  gitLastLog.stdout.toString()
    /** 格式化信息 */
    return {
      commit: (log.match(/commit\s*(.+)/) || [])[1],
      author: (log.match(/Author:\s*(.+)/) || [])[1],
      date: (log.match(/Date:\s*(.+)/) || [])[1],
    }
  }
  return null
}

/**
 * 获取当前分支
 */
export const getCurrentBranch = (): string | null => {
  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch.stdout.length) {
    return branch.stdout.toString()
  }
  return null
}

