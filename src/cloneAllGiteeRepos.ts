import fs from "fs";
import axios from "axios";
import signale from "signale";
import child_process from "child_process";

const { execSync } = child_process;

const PAGE_COUNT = 100;

// https://gitee.com/api/v5/swagger#/getV5ReposOwnerRepoBranchesBranch

export interface OptionProps {
  userName: string;
  theNewOrg: string;
  ignoreOrgs: string[];
  tempDirName: string;
  accessToken: string;
  newRepoName?: (orgName: string, info: RepoProps) => string;
}

export interface OrgProps {
  id: number;
  login: string;
  name: string;
  url: string;
  avatar_url: string;
  repos_url: string;
  events_url: string;
  members_url: string;
  description: string;
  follow_count: number;
}

export interface RepoProps {
  id: number;
  full_name: string;
  human_name: string;
  url: string;
  namespace: {
    id: number;
    type: string;
    name: string;
    path: string;
    html_url: string;
  };
  path: string;
  name: string;
  owner: {
    id: number;
    login: string;
    name: string;
    avatar_url: string;
    url: string;
    html_url: string;
    remark: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
  };
  assigner: {
    id: number;
    login: string;
    name: string;
    avatar_url: string;
    url: string;
    html_url: string;
    remark: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
  };
  description: string;
  private: boolean;
  public: boolean;
  internal: boolean;
  fork: boolean;
  html_url: string;
  ssh_url: string;
  forks_url: string;
  keys_url: string;
  collaborators_url: string;
  hooks_url: string;
  branches_url: string;
  tags_url: string;
  blobs_url: string;
  stargazers_url: string;
  contributors_url: string;
  commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  issues_url: string;
  pulls_url: string;
  milestones_url: string;
  notifications_url: string;
  labels_url: string;
  releases_url: string;
  recommend: boolean;
  gvp: boolean;
  homepage: null | string;
  language: null | string;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  default_branch: string;
  open_issues_count: number;
  has_issues: boolean;
  has_wiki: boolean;
  issue_comment: boolean;
  can_comment: boolean;
  pull_requests_enabled: boolean;
  has_page: boolean;
  license: null | string;
  outsourced: boolean;
  project_creator: string;
  members: string[];
  pushed_at: string;
  created_at: string;
  updated_at: string;
  parent: null | string;
  paas: null | string;
  assignees_number: number;
  testers_number: number;
  assignee: string[];
  testers: string[];
  status: string;
  programs: string[];
  enterprise: {
    id: number;
    type: string;
    name: string;
    path: string;
    html_url: string;
  };
  project_labels: string[];
  issue_template_source: string;
}

export interface RepoNextProps extends RepoProps {
  orgName: string;
  aliasName: string;
  downloadUrl: string;
}

class CloneAllRepos {
  options: OptionProps = {
    tempDirName: "__REPOS_",
    newRepoName(orgName, repoInfo) {
      const { name: repoName } = repoInfo;
      return `${orgName}__${repoName}`;
    },
    userName: "",
    theNewOrg: "",
    ignoreOrgs: [],
    accessToken: "",
  };

  constructor(options: OptionProps) {
    this.options = {
      ...this.options,
      ...options,
    };

    if (
      !this.options.userName ||
      !this.options.accessToken ||
      !this.options.theNewOrg
    ) {
      throw new Error("userName, accessToken, theNewOrg are required");
    }
    this.init();
  }

  async init() {
    const orgs = await this.getUserOrgs();
    const reposList = await this.getAllOrgsRepos(orgs);
    signale.success(`共获取 ${reposList.length} 个仓库`);
    this.createTempDir();
    this.cloneReposToLocal(reposList);
    const success = await this.createTheNewOrg();
    await this.createReposList(reposList);
    this.resetRemoteOrigin();
  }

  async getUserOrgs() {
    const { userName, accessToken: accessToken } = this.options;
    const orgs: OrgProps[] = [];
    const getData = async (pageNo = 1) => {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `https://gitee.com/api/v5/users/${userName}/orgs?access_token=${accessToken}&page=${pageNo}&per_page=${PAGE_COUNT}`,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
      };

      const response = await axios
        .request(config)
        .then((response) => {
          return response.data;
        })
        .catch((error) => {
          signale.error(`获取组织列表失败, ${error}`);
        });
      if (!response.length) return;
      const filteredOrgs: OrgProps[] = response.filter(
        (item: any) => !this.options.ignoreOrgs.includes(item.login)
      );

      orgs.push(...filteredOrgs);
      if (response.length === PAGE_COUNT) {
        await getData(pageNo + 1);
      }
    };

    await getData();
    return orgs;
  }

  getAllOrgsRepos = async (orgs: OrgProps[]) => {
    const orgNames = orgs.map((item) => item.login);
    const allRepos: RepoNextProps[] = [];

    for (const name of orgNames) {
      const repos = await this.getTheOrgRepos(name);
      repos.forEach((item) => {
        const { html_url, name } = item;
        const newRepoName = this.options.newRepoName!;
        const aliasName = newRepoName(name, item).replace("\x1B", "");

        allRepos.push({
          ...item,
          aliasName,
          orgName: name,
          downloadUrl: html_url,
        });
      });
    }
    return allRepos;
  };

  getTheOrgRepos = async (orgName: string): Promise<RepoProps[]> => {
    const { accessToken } = this.options;

    const repos: RepoProps[] = [];

    const getData = async (pageNo = 1) => {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `https://gitee.com/api/v5/orgs/${orgName}/repos?access_token=${accessToken}&type=all&page=${pageNo}&per_page=${PAGE_COUNT}`,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
      };

      const response = await axios
        .request(config)
        .then((response) => {
          return response.data;
        })
        .catch((error) => {
          signale.error(`获取组织 ${orgName} 下仓库列表失败, ${error}`);
        });
      if (!response?.length) return;
      repos.push(...response);
      if (response.length === PAGE_COUNT) {
        await getData(pageNo + 1);
      }
    };

    await getData();
    signale.success(
      `获取组织 ${orgName} 下仓库列表成功, 共 ${repos.length} 个仓库`
    );
    return repos;
  };

  createTempDir = () => {
    const tempDirName = this.options.tempDirName;
    const isExist = fs.existsSync(`./${tempDirName}`);
    if (isExist) return;
    fs.mkdirSync(`./${tempDirName}`);
  };

  cloneReposToLocal = (repos: RepoNextProps[]) => {
    const { tempDirName } = this.options;
    repos.forEach((repo, index) => {
      const { downloadUrl, aliasName } = repo;
      try {
        execSync(`git clone ${downloadUrl} ./${tempDirName}/${aliasName}`);
        signale.success(`${index} ${aliasName} 仓库 clone 成功`);
      } catch (error) {
        signale.error(`${index}  ${aliasName} 仓库 clone 失败, ${error}`);
      }
    });
  };

  async createTheNewOrg() {
    const { theNewOrg, accessToken } = this.options;

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://gitee.com/api/v5/users/organization`,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
      data: JSON.stringify({
        access_token: accessToken,
        org: theNewOrg,
        name: theNewOrg,
      }),
    };

    const response = await axios
      .request(config)
      .then((res) => res.data)
      .catch((err) => {
        signale.error(`组织创建失败, ${err}`);
      });

    if (response?.id) {
      signale.success("组织创建成功");
      return true;
    }
    return false;
  }

  async createReposList(reposList: RepoNextProps[]) {
    const failList: RepoNextProps[] = [];
    const { theNewOrg, accessToken } = this.options;
    for (let index = 0; index < reposList.length; index++) {
      const element = reposList[index];
      const { aliasName, name } = element;
      const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `https://gitee.com/api/v5/orgs/${theNewOrg}/repos`,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        data: JSON.stringify({
          access_token: accessToken,
          name: aliasName,
          private: true,
        }),
      };
      await axios
        .request(config)
        .then((res) => {
          // signale.success(`${aliasName} 仓库创建成功`);
        })
        .catch((err) => {
          failList.push(element);
          signale.error(`创建 ${aliasName} 仓库失败, ${err}`);
        });
    }

    if (failList.length) {
      signale.warn(
        `${failList.map((item) => item.name)}, 共 ${failList.length} 个仓库创建失败`
      );
      const dataList = [...failList];
      failList.length = 0;
      await this.createReposList(dataList);
    }
  }

  async resetRemoteOrigin() {
    const { tempDirName, theNewOrg } = this.options;
    const dirs = fs.readdirSync(`./${tempDirName}`);
    const errors = [];
    for (let index = 0; index < dirs.length; index++) {
      const dirName = dirs[index];
      console.log("dirName: ", dirName, index);

      try {
        const result = execSync(`
          cd ./${tempDirName}/${dirName}
          git remote set-url origin https://gitee.com/${theNewOrg}/${dirName}.git
          git push --all origin
        `);

        const branchInfo = execSync(`
          cd ./${tempDirName}/${dirName}
          git branch -r
        `);
        const [first, ...otherBranchs] = branchInfo
          .toString()
          .split("\n")
          .map((item) => item.replace(/\s*/g, ""))
          .map((item) => item.replace(/origin\//g, ""))
          .filter((item) => !!item);
        otherBranchs.forEach((branch) => {
          execSync(`
            cd ./${tempDirName}/${dirName}
            git checkout ${branch}
            git push
          `);
        });
      } catch (error) {
        errors.push(dirName);
      }
    }
    console.log(errors, "errors");
  }

  async deleteOrgRepos(orgName?: string) {
    const { theNewOrg, accessToken } = this.options;
    const org = orgName || theNewOrg;
    const list = await this.getTheOrgRepos(org);
    for (let index = 0; index < list.length; index++) {
      const element = list[index];
      const { name } = element;
      const config = {
        method: "delete",
        maxBodyLength: Infinity,
        url: `https://gitee.com/api/v5/repos/${org}/${name}`,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        data: JSON.stringify({
          access_token: accessToken,
        }),
      };
      await axios
        .request(config)
        .then((res) => {
          signale.success(`${name} 仓库删除成功`);
        })
        .catch((err) => {
          signale.error(`删除 ${name} 仓库失败, ${err}`);
        });
    }
  }
}
