const fs = require('fs')
const axios = require('axios');
const {
	execSync
} = require('child_process')

// https://gitee.com/api/v5/swagger#/getV5ReposOwnerRepoBranchesBranch


const theNewOrg = 'theNewOrg'
const tempDirName = '__REPOS_'
const ignoreOrgs = []
const access_token = ''
const userName = ''


/** 获取组织列表 */
const getOrgs = () => {
	const config = {
		method: 'get',
		maxBodyLength: Infinity,
		url: `https://gitee.com/api/v5/users/${userName}/orgs?access_token=${access_token}&page=1&per_page=100`,
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		}
	};

	return new Promise(resolve => {
		axios.request(config)
			.then((response) => {
				console.log('已经获取所有组织列表')
				resolve(response.data)
			})
			.catch((error) => {
				resolve([])
			});
	})
}


/** 获取组织下仓库列表 */
const getTheRepos = (orgName) => {
	const config = {
		method: 'get',
		maxBodyLength: Infinity,
		url: `https://gitee.com/api/v5/orgs/${orgName}/repos?access_token=${access_token}&type=all&page=1&per_page=100`,
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		}
	};

	return new Promise(resolve => {
		axios.request(config)
			.then((response) => {
				console.log(`已获取 ${orgName} 组织下的仓库列表`)
				resolve(response.data)
			})
			.catch((error) => {
				resolve([])
			});
	})
}

/** 获取多个组织下全部的仓库 */
const getAllRepos = async orgs => {
	const orgNames = orgs.map(item => item.login).filter(name => !ignoreOrgs.includes(name) && name !== theNewOrg)
	const allRepos = []
	for (const name of orgNames) {
		const repos = await getTheRepos(name)
		repos.forEach(item => {
			allRepos.push({
				url: item.html_url,
				name: item.name,
				orgName: name,
				aliasName: `${name}__${item.name}`
			})
		})
	}
	return allRepos
}

/** clone 仓库至本地 */
const cloneReposToLocal = reposList => {
	reposList.forEach(item => {
		const {
			url,
			aliasName
		} = item
		try {
			execSync(`git clone ${url} ./${tempDirName}/${aliasName}`)
		} catch (error) {
			console.log(`${aliasName} 仓库 clone 失败`)
		}
	})
}

/** 创建指定组织 */
const createTheNewOrg = () => {
	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `https://gitee.com/api/v5/users/organization`,
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		data: JSON.stringify({
			access_token,
			org: theNewOrg,
			name: theNewOrg,
		})
	}
	return axios.request(config).then(res => {
		if (res.statusText === 'Created') {
			console.log('组织创建成功')
			return true
		}
	}).catch(err => {
		console.log('组织创建失败')
	})
}

/** 创建仓库列表 */
const createReposList = async reposList => {
	for (let index = 0; index < reposList.length; index++) {
		const element = reposList[index];
		const {
			aliasName
		} = element
		const config = {
			method: 'post',
			maxBodyLength: Infinity,
			url: `https://gitee.com/api/v5/orgs/${theNewOrg}/repos`,
			headers: {
				'Content-Type': 'application/json;charset=UTF-8'
			},
			data: JSON.stringify({
				access_token,
				name: aliasName,
				private: true
			})
		}
		await axios.request(config).then(res => {
			console.log(`${aliasName} 仓库已经创建`)
		}).catch(err => {
			console.log(`${aliasName} 仓库创建失败`);
		})
	}
}

/** 重置仓库远程地址指向 */
const resetRemoteOrigin = async () => {
	const dirs = fs.readdirSync(`./${tempDirName}`)
	const errors = []
	for (let index = 0; index < dirs.length; index++) {
		const dirName = dirs[index];
		console.log('dirName: ', dirName, index);

		try {
			const result = execSync(`
				cd ./${tempDirName}/${dirName}
				git remote set-url origin https://gitee.com/${theNewOrg}/${dirName}.git
				git push --all origin
			`)

			const branchInfo = execSync(`
				cd ./${tempDirName}/${dirName}
				git branch -r
			`)
			const [first, ...otherBranchs] = branchInfo.toString()
				.split('\n')
				.map(item => item.replace(/\s*/g, ""))
				.map(item => item.replace(/origin\//g, ""))
				.filter(item => !!item)
			otherBranchs.forEach(branch => {
				execSync(`
					cd ./${tempDirName}/${dirName}
					git checkout ${branch}
					git push
				`)
			})
		} catch (error) {
			console.log('error: ', error.toString());
			errors.push(dirName)
		}
	}
	console.log(errors, 'errors')
}


const createTempDir = () => {
	const isExist = fs.existsSync(`./${tempDirName}`)
	if (isExist) return
	fs.mkdirSync(`./${tempDirName}`)
}

const init = async () => {
	// const orgs = await getOrgs()
	// const reposList = await getAllRepos(orgs)
	// createTempDir()
	// cloneReposToLocal(reposList)
	// await createTheNewOrg()
	// await createReposList(reposList)
	resetRemoteOrigin()
}

init()