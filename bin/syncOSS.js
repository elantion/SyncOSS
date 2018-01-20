#! /usr/bin/env node
const path = require('path');
const commandLineArgs = require('command-line-args');
const optionDefinitions = [
    {name: 'watch', alias: 'w', type: Boolean},
	{name: 'debug', type: Boolean}
];
const CMDArgs = commandLineArgs(optionDefinitions);
let syncOSS = require('../lib/oss.js');
let currentDir = process.cwd();
// get setting object
let ossSetting = require(path.join(currentDir, 'syncossConf.json'));
// console.log(ossSetting);
if(CMDArgs.watch !== undefined){
    ossSetting.keepWatching = CMDArgs.watch;
}
if(CMDArgs.debug !== undefined){
	ossSetting.debug = CMDArgs.debug;
}
syncOSS(ossSetting);