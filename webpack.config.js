const path = require('path');
console.log('test');
module.exports = function(env){
    console.log('test');
    let config = {};
    config.entry = {};
    config.entry.index = './lib/oss.ts';
    config.output = {};
    config.output.filename = '[name].js';
    config.output.path = path.join(cwd, 'dist');
    config.module = {};
    config.module.rules = [];
    config.module.rules.push({
        test: /\.tsx?$/,
        loader: 'ts-loader'
    });
    return config;
}