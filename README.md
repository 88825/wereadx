# wereadx

微信读书辅助工具，接口来自于微信读书网页版

## 功能列表

1. 下载书架上的书到本地，目前仅支持下载 html 格式
2. 自动更新阅读时长，可用于刷“读书排行榜”或者“阅读挑战赛”
3. 每周日晚 23:30 自动领取“时长兑福利”中的免费体验卡(暂未对外开放)
4. 支持下载用户上传的 pdf 格式的书(不计入下载次数限制，因为走的是外部的流量)


## 本地运行

> 需要提前安装 deno，参考官方的[安装指南](https://docs.deno.com/runtime/manual/getting_started/installation)

### 1. 配置环境变量
请在项目根目录下新建`.env`文件，存放以下环境变量：
```
# Supabase 数据库连接字符串，这个数据库用于存放bookId映射表，以及一些日志数据
DATABASE_URL=

# Deno KV Access Token
DENO_KV_ACCESS_TOKEN=

# Deno KV UUID
DENO_KV_UUID=
```

### 2. 执行脚本
```shell
npm run dev
```
或者
```shell
yarn dev
```


## 部署指南

> 如果想要自己部署，可参考以下步骤进行部署，目前仅支持部署到 Deno Deploy。
> 如果不想自己部署，可以使用 https://weread.deno.dev 公共服务，但会有限制，比如下载次数限制为每月100次，不支持自动领取体验卡等。

### 1. fork 本项目

### 2. 新建 Deno Deploy 项目，配置如下:
![项目配置](assets/setup.png)

### 3. 部署完成，在 Deno Deploy 的设置页面，添加环境变量
![环境变量配置](assets/env.png)

### 4. 设置定时任务
自动阅读和兑换体验卡都需要定时任务来触发执行，目前deno deploy自己的消息队列不太好用，所以采用 cloudflare 的 worker 来作为定时任务的触发器。

#### 自动阅读的触发器
在 CloudFlare 控制台添加一个 worker，代码如下：
```js
export default {
    async scheduled(event, env, ctx) {
        // 注意：此处的域名替换成你自己部署的域名
        const resp = await fetch('https://weread.deno.dev/cron/read/v2')
        console.log(await resp.text())
    },
};
```
设置 cron 触发周期为 `*/30 * * * *`，如下图所示：
![自动阅读的触发器](assets/cron-read.png)

#### 自动兑换体验卡的触发器
worker代码如下：
```js
export default {
    async scheduled(event, env, ctx) {
        // 注意：此处的域名替换成你自己部署的域名
        const resp = await fetch('https://weread.deno.dev/cron/exchange-awards')
        console.log(await resp.text())
    },
};
```
触发周期设置为 `30 15 * * sun`(北京时间每周日晚11点30分)，如下图所示：
![兑换体验卡的触发器](assets/cron-exchange.png)


## 特别注意

### 1. 关于付费内容
本项目不支持下载 **需要付费才能查看** 的内容，该内容通常表现为每章只有开头的一段内容，后面跟着省略号，如下图所示：

![需要付费才能查看的内容](assets/incomplete.png)

### 2. 关于双重验证码

扫码登录时会提示下面的二次确认，但实际上并不需要输入这个验证码也可以登录成功。

![登录时二次确认](assets/login.png)

这个应该是属于微信读书的bug，后续如果微信读书调整的话，我会跟进处理这个问题。


## 后续计划

- 修复部分图片无法加载的问题；
- 美化网站样式；
- 添加更多微信读书API，比如导出笔记、书评等；
- 支持下载更多电子书格式，比如 epub/azw3 等，[可以关注这个issue。](https://github.com/champkeh/wereadx/issues/2)
