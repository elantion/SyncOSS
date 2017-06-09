# SyncOSS 阿里云OSS文件同步工具

同步本地与OSS文件，并自动刷新CDN。

## 功能介绍

原本是想在使用Gulp的时候，我希望生成的文件能自动同步到阿里云OSS，这样我就不必每次编辑完文件之后都要手动更新OSS文件。

###优点
1. 不仅有上传和更新功能，还带有删除功能，不会浪费OSS的容量（省钱）。
2. 在程序启动时，程序会把OSS和本地的文件进行MD5对比，所以由始至终，本地和OSS的文件都是相同的。
3. 带有CDN刷新功能，所以你不必手动刷新文件。

###缺点
1. 监视同步功能会耗费大量内存，如果你开发机内存较小（如只有1G），则不建议使用（可设置keepWatching:false将其关闭）。
2. 暂只能以“本地文件为准”方式同步，日后会添加更多模式。
3. 目前没在服务器上使用过，只在windows开发机上运行过

## 使用方法

1.安装
```
npm install syncoss -g
```

2.配置

请在项目根目录下放置syncossConf.json文件，参考下面的写法：（请删除注释，json是没有注释的)

```json
{
  "AccessKeyId": "xxx",
  "AccessKeySecret": "xx",
  "cdn": {
    "apiVersion": "2014-11-11",
    "endpoint": "https://cdn.aliyuncs.com"
  },
  "oss": {
    "securityToken": "", //TSS权限设置
    "endpoint": "http://oss-cn-hangzhou.aliyuncs.com", //oss地区
    "region": "oss-cn-hangzhou", //endpoint 和 region 必须要提供其中一个，当设置了endpoint，region会被忽略
    "internal": true, //配合region使用，如果指定internal为true，则访问内网节点,
    "secure": true, //配合region使用，如果指定了secure为true，则使用HTTPS访问
    "cname": "", //配合endpoint使用，如果指定了cname为true，则将endpoint视为用户绑定的自定义域名
    "timeout": 60 //默认为60秒，指定访问OSS的API的超时时间
  },
  "cdnDomain": "oss.mentry.cn", //如果设置了这个参数，syncOSS将会自动刷新CDN文件
  "AccessControlAllowOrigin": "www.mentry.cn",
  "bucket": "mentry-oss",
  "watch": {
    "ignored": ""
  },
  "keepWatching": false,
  "syncDir": "public", //要同步的文件夹
  "syncFilter": [ //文件夹过滤
    "js", "css", "vendor", "!images"//有叹号是不同步的文件夹，没叹号就是要同步的文件夹
  ]
}
```

3.运行

打开命令行，cd到项目根目录，运行:

```shell
syncOSS
```

## 工作流程

1. 获取设定的OSS父文件夹下所有文件的信息，用于文件对比。
2. 对比本地和OSS的文件，如ETag不同或者远程没有这个文件，那么就会上传或更新OSS的文件。如果OSS有，但本地没有的文件，那么SyncOSS就会将OSS这个文件删除。
3. 监视本地文件夹，当发现有文件“增删改”，即会触发相应的同步行为。例如本地删除一个文件，OSS也同样会将这个文件删除。

## Author 作者
James Yin

## License
Copyright (c) 2015 James Yin, elantion@gmail.com

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