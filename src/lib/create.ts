import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import setupHusky from './husky';
import setupNpmrc from './npmrc';
import setupAxios from './axios';
import { select, confirm } from '@inquirer/prompts';

export async function createProject(projectName: string | undefined): Promise<void> {
	const template = await select({
		message: '请选择构建工具',
		choices: [
			{ value: 'webpack', name: 'webpack' },
			{ value: 'vite', name: 'vite' }
		],
		default: 'vite'
	});

	/**展示只有默认 */
	const templateLocName = 'default';
	const templateDir = path.resolve(__dirname, `../templates/${template}/${templateLocName}`);
	const targetDir = path.resolve(process.cwd(), projectName || '.');

	/**验证模板是否存在 */
	if (!(await fs.pathExists(templateDir))) {
		console.error(chalk.red(`✖ 模板目录不存在: ${templateDir}`));
		console.error(chalk.yellow(`请创建以下目录结构:`));
		console.log(`
templates/
├── webpack/
│   └──default
│
└── vite/
    └──default
    `);
		process.exit(1);
	}

	/**检查目录是否存在 */
	if (fs.existsSync(targetDir)) {
		const overwrite = await confirm({
			message: '目录已存在，是否覆盖？',
			default: false
		});
		if (!overwrite) process.exit(1);
		await fs.emptyDir(targetDir);
	}

	try {
		/**复制模板文件 */
		await fs.copy(templateDir, targetDir);

		/**询问是否添加axios作为HTTP客户端 */
		const needAxios = await confirm({
			message: '是否以 axios 作为HTTP客户端?',
			default: true
		});

		if (needAxios) {
			await setupAxios(targetDir);
		}

		/**询问是否添加国内淘宝镜像 */
		const needNpmrc = await confirm({
			message: '是否需要配置国内淘宝镜像?',
			default: true
		});

		/**询问是否添加husky */
		const needHusky = await confirm({
			message: '是否需要添加 husky (Git hooks 工具)?',
			default: true
		});

		/**动态修改文件内容 */
		if (projectName) {
			// 读取并解析JSON
			const pkgPath = path.join(targetDir, 'package.json');
			const pkg = await fs.readJson(pkgPath);

			// 修改name字段
			pkg.name = projectName
				.toLowerCase() // 强制小写
				.replace(/\s+/g, '-') // 空格转连字符
				.replace(/[^a-z0-9-]/g, ''); // 移除非字母数字字符

			// 写回文件
			await fs.writeJson(pkgPath, pkg, { spaces: 2 });
		}

		if (needNpmrc) {
			await setupNpmrc(targetDir);
		}

		if (needHusky) {
			await setupHusky(targetDir);
		}

		console.log(chalk.green('✔ 项目创建成功！'));
		console.log(chalk.blue(`◇ 进入项目目录：cd ./${projectName}`));
		console.log(chalk.blue(`△ 安装依赖：npm i / yarn / pnpm i`));
		console.log(chalk.blue(`☆ 本地启动项目：npm run dev / yarn run dev / pnpm run dev`));
	} catch (err: any) {
		console.error(chalk.red('✖ 项目创建失败:'));
		if (err?.message.includes('User force closed the prompt with SIGINT')) {
			console.log(chalk.yellow('⚠ 操作已取消'));
		}
		process.exit(1);
	}
}
