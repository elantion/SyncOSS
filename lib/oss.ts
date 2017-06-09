import chokidar = require('chokidar');
import mime = require('mime');
import ALY = require('aliyun-sdk');
import path = require('path');
import fs = require('fs');
import url = require('url');
import crypto = require('crypto');
export = async function (options) {
    //create OSS instance
    //options.oss.apiVersion = options.oss.apiVersion || '2013-10-15';
    if(!options.AccessKeySecret){
        throw new Error('Please provide AccessKeySecret.');
    }
    if(!options.AccessKeyId){
        throw new Error('Please provide AccessKeyId.');
    }
    options.oss.accessKeyId = options.AccessKeyId;
    options.oss.secretAccessKey = options.AccessKeySecret;
    options.oss.securityToken = options.oss.securityToken || '';
    options.oss.apiVersion = options.oss.apiVersion || '2013-10-15';
    if(!options.oss.endpoint && !options.oss.region){
        throw new Error('Please provide oss endpoint or region.');
    }
    if(!options.oss.endpoint){
        options.oss.endpoint = (options.oss.secure ? 'https' : 'http') + '://' + options.oss.region + (options.oss.internal ? '.internal' : '') + '.aliyuncs.com';
    }
    let oss = new ALY.OSS(options.oss);
    //create cdn instance
    let cdn:ALY.CDN;
    if(options.cdn){
        options.cdn.accessKeyId = options.AccessKeyId;
        options.cdn.secretAccessKey = options.AccessKeySecret;
        options.cdn.endpoint = options.cdn.endpoint || 'https://cdn.aliyuncs.com';
        options.cdn.apiVersion = options.cdn.apiVersion || '2014-11-11';
        cdn = new ALY.CDN(options.cdn);
    }
    const cwd = options.syncDir || '';
    let getBuckets = function () {
        return new Promise(function (resolve, reject) {
            oss.listBuckets(function (err, list) {
                if(err){
                    reject(err);
                }else{
                    resolve(list);
                }
            });
        });
    };
    let buckets:any = await getBuckets();
    let bucketsList = buckets.Buckets;
    let bucket:any;
    for(let i = 0, l = bucketsList.length; i < l; i++){
        if(options.oss.bucket.toUpperCase() === bucketsList[i].Name.toUpperCase()){
            bucket = bucketsList[i];
        }
    }
    if(!bucket){
        throw new Error('Can not find your bucket. Pleas check the bucket name again.');
    }
    //oss use unix type of file type
    const prefix = cwd.replace(/\\/g, '/');
    let getObjects = function (cb) {
        let nextMarker = '';
        let bucketObjects = [];
        let getObjectsLoop = function () {
            if(typeof nextMarker === 'string'){
                oss.listObjects({
                    Bucket: bucket.Name,
                    MaxKeys: 20,
                    Prefix: prefix,
                    Marker: nextMarker
                }, function (listObjectsErr, ossObject) {
                    ossObject.Contents.forEach(function (o) {
                        options.debug && console.log('Found bucket file: ', o.Key);
                    });
                    if(listObjectsErr){
                        throw new Error(listObjectsErr);
                    }
                    nextMarker = ossObject.NextMarker;
                    if(ossObject.NextMarker){
                        options.debug && console.log('next marker: ' + ossObject.NextMarker);
                    }else{
                        options.debug && console.log('Reach the end of the bucket.');
                    }
                    bucketObjects = bucketObjects.concat(ossObject.Contents);
                    getObjectsLoop();
                });
            }else{
                cb(bucketObjects);
                options.debug && console.log('Scan oss bucket finish.');
            }
        };
        getObjectsLoop();
    };
    getObjects(function (bucketObjects) {
        //get all path of the bucket
        let bucketPaths = [];
        let localPaths = [];
        for(let i = 0; i < bucketObjects.length; i++){
            bucketPaths.push(bucketObjects[i].Key);
        }
        const pathsArr = Array.isArray(options.syncFilter) ? options.syncFilter : options.syncFilter.split(' ');
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
        let filesWatcher = chokidar.watch(pathsArr, options.watch);
        //upload or update file function
        let upsertFile = function (localFilePath) {
            let contentType = mime.lookup(localFilePath);
            let standerFilePath = localFilePath.replace(/\\/g, '/');
            fs.readFile(localFilePath, function (readFileErr, fileData) {
                if (readFileErr) {
                    throw readFileErr;
                }
                oss.putObject({
                    Bucket: bucket.Name,
                    Body: fileData,
                    Key: standerFilePath,
                    ContentEncoding: 'utf-8',
                    ContentType: contentType,
                    AccessControlAllowOrigin: options.AccessControlAllowOrigin || '*',
                    CacheControl: options.CacheControl || 'no-cache',
                    Expires: options.Expires || null
                }, function (putObjectErr) {
                    if (putObjectErr) {
                        console.error('error:', putObjectErr);
                        return putObjectErr;
                    }
                    console.log('upload success: ' + localFilePath);
                    if(bucketPaths.indexOf(standerFilePath) === -1){
                        bucketPaths.push(standerFilePath);
                    }
                    if(localPaths.indexOf(standerFilePath) === -1){
                        localPaths.push(standerFilePath);
                    }
                    //refresh cdn
                    if(cdn){
                        let cdnObjectPath = url.format({
                            protocol: 'http',
                            hostname: options.cdnDomain,
                            pathname: standerFilePath
                        });
                        cdn.refreshObjectCaches({
                            ObjectType: 'File',
                            ObjectPath: cdnObjectPath
                        }, function(refreshCDNErr) {
                            if(refreshCDNErr){
                                console.error('refresh cdn error: ', refreshCDNErr);
                            }else{
                                console.log('Refresh cdn file success: ', standerFilePath);
                            }
                        });
                    }
                });
            });
        };
        //delete bucket file function
        let deleteFile = function (filePath) {
            let standerPath = filePath.replace(/\\/g, '/');
            oss.deleteObject({
                Bucket: bucket.Name,
                Key: standerPath
            }, function (err) {
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
            });
        };
        //add new files
        filesWatcher.on('add', function (localFilePath) {
            let standerFilePath = localFilePath.replace(/\\/g, '/');
            let bucketIndex = bucketPaths.indexOf(standerFilePath);
            if(bucketIndex === -1){
                options.debug && console.log('Bucket file not exist, uploading local file: ' + localFilePath);
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
                                options.debug && console.log('ETag different, uploading local file: ' + localFilePath);
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
                if(localPaths.indexOf(bucketPaths[i]) === -1){
                    let filePath = bucketPaths[i];
                    options.debug && console.log('No this local file found, deleting: ', filePath);
                    deleteFile(filePath);
                }
            }
            options.debug && console.log('Scanning local file finish.');
            if(options.keepWatching !== true){
                filesWatcher.close();
                console.log('Sync files watcher closed.');
                return;
            }
            console.log('Sync files watcher running...');
        });
        //modify file
        filesWatcher.on('change', function (filePath) {
            console.log('Local file change, uploading: ' + filePath);
            upsertFile(filePath);
        });
        //delete file
        filesWatcher.on('unlink', function (filePath) {
            console.log('Deleting bucket file: ' + filePath);
            deleteFile(filePath);
        });
    });
};
