
/** 获取指定长度的随机数 */
export const generateRandomId = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  
  for (let i = 0; i < length; i++) {
    let randomIndex = Math.floor(Math.random() * chars.length);
    id += chars[randomIndex];
  }
  return id;
}

/** 获取代码字符串中导出的变量 */
export const filterExported = (code: string) => {
  const exportRegex = /export\s+(?:default\s+)?(const|let|var|function)\s+(\w+)/g;
  const commentRegex = /\/\/.*|\/\*[\s\S]*?\*\//g;
  
  const exportedCode: string[] = [];
  let match;

  while ((match = exportRegex.exec(code)) !== null) {
    const [_, type, name] = match;
    if (!isCommented(match.index)) {
      exportedCode.push(name);
    }
  }

  return exportedCode;

  function isCommented(index: number) {
    commentRegex.lastIndex = 0;
    let isCommented = false;
    let commentMatch;

    while ((commentMatch = commentRegex.exec(code)) !== null) {
      if (commentMatch.index > index) {
        break;
      }

      if (index <= commentRegex.lastIndex) {
        isCommented = true;
        break;
      }
    }

    return isCommented;
  }
}