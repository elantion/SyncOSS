const chokidar = require('chokidar');
const mime = require('mime');
const ALY = require('aliyun-sdk');
const path = require('path');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');
module.exports = function (options) {
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
    options.oss.apiVersion = '2013-10-15';
    if(!options.oss.endpoint && !options.oss.region){
        throw new Error('Please provide oss endpoint or region info.');
    }
    if(!options.oss.endpoint){
        options.oss.endpoint = (options.oss.secure ? 'https' : 'http') + '://' + options.oss.region + (options.oss.internal ? '.internal' : '') + '.aliyuncs.com';
    }
    let oss = new ALY.OSS(options.oss);
    //create cdn instance
    if(options.cdnDomain){
        options.cdn = options.cdn || {};
        options.cdn.accessKeyId = options.AccessKeyId;
        options.cdn.secretAccessKey = options.AccessKeySecret;
        options.cdn.endpoint = options.cdn.endpoint || 'https://cdn.aliyuncs.com';
        options.cdn.apiVersion = options.cdn.apiVersion || '2014-11-11';
        let cdn = new ALY.CDN(options.cdn);
    }
    const cwd = options.syncDir || '';
    console.log(oss);
    oss.listBuckets(function (err, res) {
        console.log(res);
    });
    //oss use unix type of file type
    const prefix = cwd.replace(/\\/g, '/');
    let getObjects = function (cb) {
        let nextMarker = '';
        let bucketObjects = [];
        let getObjectsLoop = function () {
            if(typeof nextMarker === 'string'){
                oss.listObjects({
                    Bucket: options.bucket,
                    MaxKeys: 20,
                    Prefix: prefix,
                    Marker: nextMarker
                }, function (listObjectsErr, bucket) {
                    if(listObjectsErr){
                        throw new Error(listObjectsErr);
                    }
                    nextMarker = bucket.NextMarker;
                    console.log('next marker: ' + bucket.NextMarker);
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
                    Bucket: options.bucket,
                    Body: fileData,
                    Key: standerFilePath,
                    ContentEncoding: 'utf-8',
                    ContentType: contentType,
                    AccessControlAllowOrigin: options.AccessControlAllowOrigin || '*',
                    CacheControl: options.CacheControl || 'no-cache',
                    Expires: options.Expires || null
                }, function (putObjectErr) {
                    if (putObjectErr) {
                        console.log('error:', putObjectErr);
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
                    if(options.cdnDomain){
                        let cdnObjectPath = url.format({
                            protocol: 'http',
                            hostname: options.cdnDomain,
                            pathname: standerFilePath
                        });
                        cdn.refreshObjectCaches({
                            ObjectType: 'File',
                            ObjectPath: cdnObjectPath
                        }, function(refreshCDNErr) {
                            if(refreshCDNErr){console.log('refresh cdn error: ', refreshCDNErr); }
                        });
                    }
                });
            });
        };
        //delete bucket file function
        let deleteFile = function (filePath) {
            let standerPath = filePath.replace(/\\/g, '/');
            oss.deleteObject({
                Bucket: options.bucket,
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
            if(options.keepWatching !== true){
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
