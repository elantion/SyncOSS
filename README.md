# SyncOSS 阿里云OSS文件同步工具
A Node.js package used for synchronizing files between local and OSS.

一个用于同步本地文件与阿里云OSS的Node.js模块。

## Intro 功能介绍
I love Gulp, but I don't want to update my files to OSS after edit my source files. So I make this little tool to make a little help.
After I make some progress, this module have more features then I expected.

1. It is not just have 'upload' and 'update' functions and it is also include 'remove' function, it won't wast your oss storage.
2. At the initiation, this module will compare local and OSS files by MD5. So, from the begin to the end, this module can make 
local and OSS files are definitely the same.
3. Include CDN refresh feature, so you don't need to fresh your CDN by hand.

原本是想在使用Gulp的时候，我希望生成的文件能自动同步到阿里云OSS，这样我就不必每次编辑完文件之后都要手动更新。但随着不断更新，它的功能比想象的多得多。

1. 不仅有上传和更新功能，还带有删除功能，不会浪费OSS的流量（省钱）。
2. 在程序启动时，程序会把OSS和本地的文件进行MD5对比，所以由始至终，本地和OSS的文件都是相同的。
3. 带有CDN刷新功能，所以你不必手动刷新文件。

## 使用方法 Usage
Install 安装
```
npm install syncoss --save
```

Config example 配置参考以下代码:

You can put this code into your enter js file(app.js).
Or you can put it somewhere else. For example, under a url route, so you can synchronize when you enter the URL.

你可把以下这段代码放到你项目的入口文件（如app.js），这样你就能每次运行项目就自动同步所有文件，当然你也能放到别的位置，例如放到某个URL路由里，
当访问这个URL时候才进行同步，视乎你怎么使用。
```js
require('syncoss')({
    //OSS config
    //OSS配置
    oss: {
        //your Access Key ID and Access Key Secret, you can find them on your aliyun console panel.
        //你的Access Key ID 和 Access Key Secret，可以在你的阿里云控制台里找到。
        accessKeyId: YourAccessKeyId,
        secretAccessKey: YourAccessKeySecret,
        //use for STS Authorize, leave it blank if you don't know what it is.
        //用于STS认证，如不懂是什么，留空即可。
        securityToken: "",
        //your OSS location server url, below it is a HanZhou OSS url example
        //你的OSS地理服务器URL，如在杭州，即像如下填写
        endpoint: 'http://oss-cn-hangzhou.aliyuncs.com'
    },
    //if you want to refresh cdn after upload or update files. Just provide below property.
    //如果你需要在上传文件到ＯＳＳ之后更新相应的ＣＤＮ缓存，只需提供以下这个参数即可
    cdnDomain: 'oss.mentry.cn',
    cdn: {
       //You can set up your CDN configure, check out CDN API.
      //你也可以设置CDN的参数，具体请参考CDN的API
      accessKeyId: YourAccessKeyId,
      secretAccessKey: YourAccessKeySecret
    },
    AccessControlAllowOrigin: 'www.mentry.cn',
    //bucket name
    //bucket 名称
    bucket: 'mentry-oss',
    //监视文件参数
    watch: {
        //ignores .dotfiles
        //忽略“点(.)文件”, linux的隐藏文件
        ignored: /[\/\\]\./
    },
    //parent directory. If you don not set this property, SyncOSS will download all files' info in your bucket when startup.
    //So I recommend set this up. For example, I set it to 'public',
    //so it will only request the files' info under 'public' directory in OSS.
    //父路径，由于每次开启都会向OSS获取所有文件的信息，因此设置一个父路径能明显减少获取文件信息的数量。
    //例如设为public，那么它只会获取OSS里public文件下的文件信息，而不是整个bucket的文件。推荐使用。
    cwd: 'public',
    //the directories you need to watch, can be a array or a string(use space to split directories name).
    //需要监视的文件夹，可以是数组，也可是字符串（使用空格分隔文件夹）。
    src: ['css', 'js', '!exclude-folder', '!exclude/exclude.file' ]
});
```

## Work flow 工作流程

1. request all files' info under parent directory and store it into a array value. It is used for comparison.

   获取设定的OSS父文件夹下所有文件的信息，用于文件对比。
2. Compare all files between local and OSS. If the ETag is different or OSS miss the file, SyncOSS will upload the local file to OSS.
   If OSS has files that local do not have, then SyncOSS will try to delete the files in OSS.
   
   对比本地和OSS的文件，如ETag不同或者远程没有这个文件，那么就会上传或更新OSS的文件。如果OSS有，但本地没有的文件，那么SyncOSS就会将OSS这个文件删除。
3. Watch local files. If local files have 'change', 'add' or 'delete' actions. The OSS relate files will have same action.

   监视本地文件夹，当发现有文件“增删改”，即会触发相应的同步行为。例如本地删除一个文件，OSS也同样会将这个文件删除。

## Author 作者
James Yin, the owner of http://www.mentry.cn
Love to share.

## License
Copyright (c) 2015 James Yin, elantion@gmail.com, http://www.mentry.cn

Permission is hereby granted, free of charge,
to any person obtaining a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.