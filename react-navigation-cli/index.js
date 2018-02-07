#!/usr/bin/env node

let execSync = require('child_process').execSync;
let fork = require('child_process').fork;
let exec = require('child_process').exec;
let execFile = require('child_process').execFile;
let program = require('commander');
let fs = require('fs');
let Spinner = require('cli-spinner').Spinner;
let path = require('path');
let semver = require('semver');
const chalk = require('chalk');

let taskIndex = 0;
let totalTask = 10;
let spinner = new Spinner(`%s waiting [${taskIndex}/${totalTask}]...`);
spinner.setSpinnerString('⠃⠋⠉⠙⠰⠴⠤⠦');
function upSpinner() {
	taskIndex++;
	spinner.setSpinnerTitle(`%s waiting [${taskIndex}/${totalTask}]...`);
}

function whiteLog(msg) {
	console.log(chalk.keyword('white')(msg));
}

function grayLog(msg) {
	console.log(chalk.keyword('gray')(msg));
}

function yellowLog(msg) {
	console.log(chalk.keyword('yellow')(msg));
}

function redLog(msg) {
	console.log(chalk.keyword('red')(msg));	
}

let SUCCESS_LOG = function(root,name) {
	return `To run your app on iOS:
cd ${root}
react-native run-ios
- or -
Open ios/${name}.xcodeproj in Xcode
Hit the Run button
To run your app on Android:
cd ${root}
Have an Android emulator running (quickest way to get started), or a device connected
react-native run-android`;
}

let CLI_START_CONTENT = function(projectPath,name,version) {
	return `#!/usr/bin/env node

let path = require('path');
let cliPath = path.resolve(
    process.cwd(),
    'node_modules',
    'react-native',
    'cli.js'
);

let cli = require(path.resolve(
	 process.cwd(),
    'node_modules',
    'react-native',
    'cli.js'
));

cli.init('${projectPath}', '${name}');
process.send('success');
`;
}

let PROJECT_INDEX_CONTENT = function(name) {
	return `import { AppRegistry } from 'react-native';
import App from './src/containers/App';

AppRegistry.registerComponent('${name}', () => App);
`;
}

let PROJECT_TEST_CONTENT = function() {
	return `import 'react-native';
import React from 'react';
import App from '../src/containers/App';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  const tree = renderer.create(
    <App />
  );
});
`;
}

function installModules(names, success, index=0) {
	let name = names[index];
	let cmd = `npm install --save ${name}`;
	exec(cmd, (error, stdout, stderr) => {
		if (error) {
			redLog(error);
			process.exit(1);
		} else if ((index - names.length) < 0) {
			upSpinner();
			installModules(names, success, index+1);
		} else {
			success();
		}
	});
}

function installDefaultFiles(root,name,success) {
	let cliPath = path.resolve(process.cwd(),'temp_init_cli.js');

	fs.writeFileSync(cliPath, CLI_START_CONTENT(root,name));

	fork(cliPath, {silent: true}).on('message', m=>{
		execSync(`rm ${cliPath}`);
		m === 'success' && success();
	});
}

function getTemplateName(notDrawer,stackInTab) {
	if (notDrawer && stackInTab) {
		return 'noDrawerStackInTabTemplate';
	} else if (notDrawer) {
		return 'noDrawerTemplate';
	} else if (stackInTab) {
		return 'stackInTabTemplate';
	} else {
		return 'defaultTemplate';
	}
}

function copyTemplate(projectName,templateName) {	
    let srcPath = path.resolve(
		process.cwd(),
	    'node_modules',
	    'react-navigation-templates',
	    'lib',
	    templateName,
	    'src'
    );

	execSync(`cp -r ${srcPath} ./src`);

	let indexPath = path.resolve(process.cwd(),'index.js');
	fs.writeFileSync(indexPath, 	PROJECT_INDEX_CONTENT(projectName));

	let testPath = path.resolve(process.cwd(),'__tests__','App.js');
	fs.writeFileSync(testPath, PROJECT_TEST_CONTENT());

	let appPath = path.resolve(process.cwd(),'App.js');
	execSync(`rm ${appPath}`);
}

program
	.version('0.1.2')
	.command('init <ProjectName>')
	.option('-t , --target [version]', 'Specify the version of react-native to create')
	.option('--not-drawer', 'Create not-drawer template')
	.option('--stack-in-tab', 'Create stack-in-tab template')
	.action((name,cmd)=>{

		let root = path.resolve(process.cwd(),name);

		if (fs.existsSync(root)) {
			console.log(`Directory ${name} already exists.`);
			process.exit(1);
		} else {
			fs.mkdirSync(name, 0755);
			var packageJson = {
			    name: name,
			    version: '0.0.1',
			    private: true,
			    scripts: {
			      start: 'node node_modules/react-native/local-cli/cli.js start',
			      ios: 'react-native run-ios',
			      android: 'react-native run-android',
			    }
			};
			fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(packageJson));
			process.chdir(root);
		}

		whiteLog(`Start to create project.`);	
		spinner.start();

		let version = cmd.target ? `@${cmd.target}` : '';
		installModules([
			'react-native'+version,
			'react-navigation-templates',
			'react-redux',
			'react-navigation',
			'redux',
			'redux-logger',
			'redux-thunk',
			'react-navigation-redux-helpers'], ()=>{
			spinner.stop(true);
			grayLog('Install dependencies, done.');
			spinner.start();

			installDefaultFiles(root,name,()=>{
				upSpinner();
				spinner.stop(true);
				grayLog('Initialize Project, done.');

				spinner.start();
				let projectName = name;
				let tamplateName = getTemplateName(cmd.notDrawer,cmd.stackInTab);
				copyTemplate(projectName,tamplateName);

				upSpinner();
				spinner.stop(true);
				grayLog('Copy template, done.\n');
				
				whiteLog(SUCCESS_LOG(root,name));
			});

		});
	});

program.parse(process.argv);



