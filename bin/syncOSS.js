#! /usr/bin/env node
const path = require('path');
const commandLineArgs = require('command-line-args');
const optionDefinitions = [
    {name: 'watch', alias: 'w', type: Boolean, defaultOption: false}
];
const CMDArgs = commandLineArgs(optionDefinitions);
let syncOSS = require('../lib/oss.js');
let currentDir = process.cwd();
//get setting object
let ossSetting = require(path.join(currentDir, 'syncOSS.json'));
if(CMDArgs.watch !== undefined){
    ossSetting.keepWatching = CMDArgs.watch;
}
syncOSS(ossSetting);