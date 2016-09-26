#! /usr/bin/env node
var path = require('path');
var syncOSS = require('../lib/oss.js');
var currentDir = process.cwd();
//get setting object
var ossSetting = require(path.join(currentDir, 'syncOSS.json'));
syncOSS(ossSetting);