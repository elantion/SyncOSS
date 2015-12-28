'use strict';
const chokidar = require('chokidar');
const mime = require('mime');
const ALY = require('aliyun-sdk');
const path = require('path');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');
module.exports = function (options) {
    //create OSS instance
    options.oss.apiVersion = options.oss.apiVersion || '2013-10-15';
    options.oss.securityToken = options.oss.securityToken || '';
    var oss = new ALY.OSS(options.oss);
    //create cdn instance
    if(options.cdnDomain){
        options.cdn = options.cdn || {};
        options.cdn.accessKeyId = options.cdn.accessKeyId || options.oss.accessKeyId;
        options.cdn.secretAccessKey = options.cdn.secretAccessKey || options.oss.secretAccessKey;
        options.cdn.endpoint = options.cdn.endpoint || 'https://cdn.aliyuncs.com';
        options.cdn.apiVersion = options.cdn.apiVersion || '2014-11-11';
        var cdn = new ALY.CDN(options.cdn);
    }
    const cwd = options.cwd || '';
    const prefix = cwd.replace(/\\/g, '/');
    var getObjects = function (cb) {
        var nextMarker = '';
        var bucketObjects = [];
        var getObjectsLoop = function () {
            if(typeof nextMarker === 'string'){
                oss.listObjects({
                    Bucket: options.bucket,
                    MaxKeys: 100,
                    Prefix: prefix,
                    Marker: nextMarker
                }, function (listObjectsErr, bucket) {
                    if(listObjectsErr){return console.log(listObjectsErr); }
                    nextMarker = bucket.NextMarker;
                    bucketObjects = bucketObjects.concat(bucket.Contents);
                    getObjectsLoop();
                });
            }else{
                cb(bucketObjects);
                return console.log('finish OSS request loop');
            }
        };
        getObjectsLoop();
    };
    getObjects(function (bucketObjects) {
        //get all path of the bucket
        var bucketPaths = [];
        var localPaths = [];
        for(let i = 0; i < bucketObjects.length; i++){
            bucketPaths.push(bucketObjects[i].Key);
        }
        const pathsArr = Array.isArray(options.src) ? options.src : options.src.split(' ');
        for(let i = 0; i < pathsArr.length; i++){
            if(pathsArr[i].startsWith('!')){
                pathsArr[i] = pathsArr[i].replace('!', '');
                pathsArr[i] = '!' + path.join(cwd, pathsArr[i]);
            }else{
                pathsArr[i] = path.join(cwd, pathsArr[i]);
            }
        }
        //set watcher default config value
        options.watch = options.watch || {};
        var filesWatcher = chokidar.watch(pathsArr, options.watch);
        //upload or update file function
        var upsertFile = function (localFilePath) {
            let contentType = mime.lookup(localFilePath);
            let standerFilePath = localFilePath.replace(/\\/g, '/');
            fs.readFile(localFilePath, function (readFileErr, fileData) {
                if (readFileErr) {
                    throw readFileErr;
                }
                oss.putObject({
                    Bucket: options.bucket,
                    Body: fileData,
                    Key: standerFilePath,
                    ContentEncoding: 'utf-8',
                    ContentType: contentType,
                    AccessControlAllowOrigin: options.AccessControlAllowOrigin || '*',
                    CacheControl: options.CacheControl || 'no-cache',
                    Expires: options.Expires || null
                }, function (putObjectErr, uploadedFileInfo) {
                    if (putObjectErr) {
                        console.log('error:', putObjectErr);
                        return putObjectErr;
                    }
                    console.log('uploaded: ' + localFilePath);
                    console.log('Network info: ', uploadedFileInfo);
                    if(bucketPaths.indexOf(standerFilePath) === -1){
                        bucketPaths.push(standerFilePath);
                    }
                    if(localPaths.indexOf(standerFilePath) === -1){
                        localPaths.push(standerFilePath);
                    }
                    if(options.cdnDomain){
                        var cdnObjectPath = url.format({
                            protocol: 'http',
                            hostname: options.cdnDomain,
                            pathname: standerFilePath
                        });
                        cdn.refreshObjectCaches({
                            ObjectType: 'File',
                            ObjectPath: cdnObjectPath
                        }, function(refreshCDNErr, refreshCDNRes) {
                            if(refreshCDNErr){console.log('refresh cdn error: ', refreshCDNErr); }
                            console.log('refresh cdn success: ', refreshCDNRes);
                        });
                    }
                });
            });
        };
        //delete bucket file function
        var deleteFile = function (filePath) {
            let standerPath = filePath.replace(/\\/g, '/');
            oss.deleteObject({
                Bucket: options.bucket,
                Key: standerPath
            }, function (err, data) {
                if(err){console.log('error:', err); return err; }
                let bucketIndex = bucketPaths.indexOf(standerPath);
                if(bucketIndex !== -1){
                    bucketPaths.splice(bucketIndex, 1);
                }
                let localIndex = localPaths.indexOf(standerPath);
                if(localIndex !== -1){
                    localPaths.splice(localIndex, 1);
                }
                console.log('delete success:' + standerPath);
                console.log('Network info:', data);
            });
        };
        //catch all events, just use for fun
        //filesWatcher.on('all', function (event, filePath) {
        //    console.log(path, event);
        //});
        //add new files
        filesWatcher.on('add', function (localFilePath) {
            let standerFilePath = localFilePath.replace(/\\/g, '/');
            let bucketIndex = bucketPaths.indexOf(standerFilePath);
            if(bucketIndex === -1){
                console.log('File not exist: ' + localFilePath);
                upsertFile(localFilePath);
            }else{
                if(localPaths.indexOf(standerFilePath) === -1){
                    localPaths.push(standerFilePath);
                }
                fs.readFile(localFilePath, function (readFileErr, fileData) {
                    let fileMd5 = crypto.createHash('md5').update(fileData).digest('hex').toUpperCase();
                    for(let i = 0; i < bucketObjects.length; i++){
                        if(bucketObjects[i].Key === standerFilePath){
                            if(bucketObjects[i].ETag.replace(/"/g, '') !== fileMd5){
                                console.log('ETag different, now upload this local file: ' + localFilePath);
                                upsertFile(localFilePath);
                            }
                        }
                    }
                });
            }
        });
        //Initial scan complete.
        filesWatcher.on('ready', function () {
            //delete bucket object if local object is not exist.
            for(let i = 0; i < bucketPaths.length; i++){
                let index = localPaths.indexOf(bucketPaths[i]);
                if(index === -1){
                    let filePath = bucketPaths[i];
                    deleteFile(filePath);
                }
            }
            if(options.keepWatching === false){
                filesWatcher.close();
                console.log('Sync files watcher closed!');
            }
        });
        //modify file
        filesWatcher.on('change', function (filePath) {
            console.log('file change: ' + filePath);
            upsertFile(filePath);
        });
        //delete file
        filesWatcher.on('unlink', function (filePath) {
            console.log('file unlink: ' + filePath);
            deleteFile(filePath);
        });
    });
};
