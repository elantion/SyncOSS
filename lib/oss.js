"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var chokidar = require("chokidar");
var mime = require("mime");
var ALY = require("aliyun-sdk");
var path = require("path");
var fs = require("fs");
var url = require("url");
var crypto = require("crypto");
module.exports = function (options) {
    return __awaiter(this, void 0, void 0, function () {
        var oss, cdn, cwd, getBuckets, buckets, bucketsList, bucket, i, l, getCDNRefreshQuota, res, prefix, getObjects;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    //create OSS instance
                    //options.oss.apiVersion = options.oss.apiVersion || '2013-10-15';
                    if (!options.AccessKeySecret) {
                        throw new Error('Please provide AccessKeySecret.');
                    }
                    if (!options.AccessKeyId) {
                        throw new Error('Please provide AccessKeyId.');
                    }
                    options.oss.accessKeyId = options.AccessKeyId;
                    options.oss.secretAccessKey = options.AccessKeySecret;
                    options.oss.securityToken = options.oss.securityToken || '';
                    options.oss.apiVersion = options.oss.apiVersion || '2013-10-15';
                    if (!options.oss.endpoint && !options.oss.region) {
                        throw new Error('Please provide oss endpoint or region.');
                    }
                    if (!options.oss.endpoint) {
                        options.oss.endpoint = (options.oss.secure ? 'https' : 'http') + '://' + options.oss.region + (options.oss.internal ? '.internal' : '') + '.aliyuncs.com';
                    }
                    if (options.oss.secure === undefined) {
                        options.cdn.secure = /https/.test(options.oss.endpoint);
                    }
                    oss = new ALY.OSS(options.oss);
                    if (options.cdn) {
                        options.cdn.accessKeyId = options.AccessKeyId;
                        options.cdn.secretAccessKey = options.AccessKeySecret;
                        options.cdn.endpoint = options.cdn.endpoint || 'https://cdn.aliyuncs.com';
                        options.cdn.apiVersion = options.cdn.apiVersion || '2014-11-11';
                        cdn = new ALY.CDN(options.cdn);
                    }
                    cwd = options.syncDir || '';
                    getBuckets = function () {
                        return new Promise(function (resolve, reject) {
                            oss.listBuckets(function (err, list) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(list);
                                }
                            });
                        });
                    };
                    return [4 /*yield*/, getBuckets()];
                case 1:
                    buckets = _a.sent();
                    bucketsList = buckets.Buckets;
                    for (i = 0, l = bucketsList.length; i < l; i++) {
                        if (options.oss.bucket.toUpperCase() === bucketsList[i].Name.toUpperCase()) {
                            bucket = bucketsList[i];
                        }
                    }
                    if (!bucket) {
                        throw new Error('Can not find your bucket. Pleas check the bucket name again.');
                    }
                    if (!(options.oss.autoRefreshCDN && cdn)) return [3 /*break*/, 3];
                    getCDNRefreshQuota = function () {
                        return new Promise(function (resolve) {
                            cdn.describeRefreshQuota(function (err, res) {
                                resolve(res);
                            });
                        });
                    };
                    return [4 /*yield*/, getCDNRefreshQuota()];
                case 2:
                    res = _a.sent();
                    options.cdn.refreshQuota = res.UrlRemain;
                    options.debug && console.log('Refresh CDN file quota: ' + options.cdn.refreshQuota);
                    _a.label = 3;
                case 3:
                    prefix = cwd.replace(/\\/g, '/');
                    getObjects = function (cb) {
                        var nextMarker = '';
                        var bucketObjects = [];
                        var getObjectsLoop = function () {
                            if (typeof nextMarker === 'string') {
                                oss.listObjects({
                                    Bucket: bucket.Name,
                                    MaxKeys: 20,
                                    Prefix: prefix,
                                    Marker: nextMarker
                                }, function (listObjectsErr, ossObject) {
                                    ossObject.Contents.forEach(function (o) {
                                        options.debug && console.log('Found bucket file: ', o.Key);
                                    });
                                    if (listObjectsErr) {
                                        throw new Error(listObjectsErr);
                                    }
                                    nextMarker = ossObject.NextMarker;
                                    if (ossObject.NextMarker) {
                                        options.debug && console.log('next marker: ' + ossObject.NextMarker);
                                    }
                                    else {
                                        options.debug && console.log('Reach the end of the bucket.');
                                    }
                                    bucketObjects = bucketObjects.concat(ossObject.Contents);
                                    getObjectsLoop();
                                });
                            }
                            else {
                                cb(bucketObjects);
                                options.debug && console.log('Scan oss bucket finish.');
                            }
                        };
                        getObjectsLoop();
                    };
                    getObjects(function (bucketObjects) {
                        //get all path of the bucket
                        var bucketPaths = [];
                        var localPaths = [];
                        for (var i = 0; i < bucketObjects.length; i++) {
                            bucketPaths.push(bucketObjects[i].Key);
                        }
                        var pathsArr = Array.isArray(options.syncFilter) ? options.syncFilter : options.syncFilter.split(' ');
                        for (var i = 0; i < pathsArr.length; i++) {
                            if (pathsArr[i].startsWith('!')) {
                                pathsArr[i] = pathsArr[i].replace('!', '');
                                pathsArr[i] = '!' + path.join(cwd, pathsArr[i]);
                            }
                            else {
                                pathsArr[i] = path.join(cwd, pathsArr[i]);
                            }
                        }
                        //set watcher default config value
                        options.watch = options.watch || {};
                        var filesWatcher = chokidar.watch(pathsArr, options.watch);
                        //upload or update file function
                        var upsertFile = function (localFilePath) {
                            var contentType = mime.lookup(localFilePath);
                            var standerFilePath = localFilePath.replace(/\\/g, '/');
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
                                    if (bucketPaths.indexOf(standerFilePath) === -1) {
                                        bucketPaths.push(standerFilePath);
                                    }
                                    if (localPaths.indexOf(standerFilePath) === -1) {
                                        localPaths.push(standerFilePath);
                                    }
                                    //refresh cdn
                                    if (options.oss.autoRefreshCDN && cdn) {
                                        if (options.cdn.refreshQuota < 1) {
                                            console.error('There is no refresh cdn url quota today.');
                                            return;
                                        }
                                        var cdnDomain = '';
                                        if (/^http/.test(options.cdn.domain)) {
                                            cdnDomain = options.cdn.domain.replace(/^https?:?\/?\/?/, '');
                                            options.cdn.secure === undefined && (options.cdn.secure = /^https/.test(options.cdn.domein));
                                        }
                                        else {
                                            cdnDomain = options.cdn.domain;
                                        }
                                        var cdnObjectPath_1 = url.format({
                                            protocol: options.oss.secure ? 'https' : 'http',
                                            hostname: cdnDomain,
                                            pathname: standerFilePath
                                        });
                                        options.debug && console.log('Refreshing CDN file: ', cdnObjectPath_1);
                                        cdn.refreshObjectCaches({
                                            ObjectType: 'File',
                                            ObjectPath: cdnObjectPath_1
                                        }, function (refreshCDNErr) {
                                            if (refreshCDNErr) {
                                                console.error('refresh cdn error: ', refreshCDNErr);
                                            }
                                            else {
                                                options.cdn.refreshQuota--;
                                                console.log('Refresh cdn file success: ', cdnObjectPath_1);
                                            }
                                        });
                                    }
                                });
                            });
                        };
                        //delete bucket file function
                        var deleteFile = function (filePath) {
                            var standerPath = filePath.replace(/\\/g, '/');
                            oss.deleteObject({
                                Bucket: bucket.Name,
                                Key: standerPath
                            }, function (err) {
                                if (err) {
                                    console.log('error:', err);
                                    return err;
                                }
                                var bucketIndex = bucketPaths.indexOf(standerPath);
                                if (bucketIndex !== -1) {
                                    bucketPaths.splice(bucketIndex, 1);
                                }
                                var localIndex = localPaths.indexOf(standerPath);
                                if (localIndex !== -1) {
                                    localPaths.splice(localIndex, 1);
                                }
                                console.log('delete success:' + standerPath);
                            });
                        };
                        //add new files
                        filesWatcher.on('add', function (localFilePath) {
                            var standerFilePath = localFilePath.replace(/\\/g, '/');
                            var bucketIndex = bucketPaths.indexOf(standerFilePath);
                            if (bucketIndex === -1) {
                                options.debug && console.log('Bucket file not exist, uploading local file: ' + localFilePath);
                                upsertFile(localFilePath);
                            }
                            else {
                                if (localPaths.indexOf(standerFilePath) === -1) {
                                    localPaths.push(standerFilePath);
                                }
                                fs.readFile(localFilePath, function (readFileErr, fileData) {
                                    var fileMd5 = crypto.createHash('md5').update(fileData).digest('hex').toUpperCase();
                                    for (var i = 0; i < bucketObjects.length; i++) {
                                        if (bucketObjects[i].Key === standerFilePath) {
                                            if (bucketObjects[i].ETag.replace(/"/g, '') !== fileMd5) {
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
                            for (var i = 0; i < bucketPaths.length; i++) {
                                if (localPaths.indexOf(bucketPaths[i]) === -1) {
                                    var filePath = bucketPaths[i];
                                    options.debug && console.log('No this local file found, deleting: ', filePath);
                                    deleteFile(filePath);
                                }
                            }
                            options.debug && console.log('Scanning local file finish.');
                            if (options.keepWatching !== true) {
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
                    return [2 /*return*/];
            }
        });
    });
};
//# sourceMappingURL=oss.js.map