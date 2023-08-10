
/** 异步并发控制 */
export const runTasksWithConcurrency = (tasks: (() => Promise<any>)[], maxConcurrent: number) => {
	return new Promise((resolve, reject) => {
		const results: any[] = [];
		let index = 0;
		let runningCount = 0;

		const runTask = (task: () => Promise<any>) => {
			runningCount++;
			task().then(result => {
				results.push(result);
				runningCount--;
				startNextTask();
			}).catch(error => {
				reject(error);
			});
		}

		const startNextTask = () => {
			while (runningCount < maxConcurrent && index < tasks.length) {
				runTask(tasks[index]);
				index++;
			}

			if (runningCount === 0) {
				resolve(results);
			}
		}
		startNextTask();
	});
}