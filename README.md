# wereadx

微信读书辅助工具，数据来自于微信读书网页版

## 声明
**本软件只能下载用户可访问的书籍，不支持下载需付费才能查看的书籍，请勿用于非法用途！本软件作者不对滥用行为承担任何赔偿责任。**

## ⚠️警告⚠️
**不要同时下载多本书，不但容易下载失败，还可能导致被微信读书封号处理！！！**

## 功能列表

1. 下载书架上的书到本地，仅支持下载 **html** 和 **epub** 格式
2. 自动更新阅读时长，可用于刷“读书排行榜”或者“阅读挑战赛”
3. 每周日晚 23:30 自动领取“时长兑福利”中的免费体验卡(暂未对外开放)
4. 支持下载用户自己上传的 pdf 格式的书


## 本地运行

> 需要提前安装 deno，参考官方的[安装指南](https://docs.deno.com/runtime/manual/getting_started/installation)

```shell
deno task dev
```
或者
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

| 变量名            | 功能                                            | 是否必填          |
|----------------|-----------------------------------------------|---------------|
| DEPLOY_DOMAIN  | 最终部署的域名，格式为: `https://xxx.deno.dev`，与发送提醒邮件有关 | 需要自动阅读暂停提醒时必填 |
| RESEND_API_KEY | 用于发送邮件，格式为: `re_xxx`                          | 需要自动阅读暂停提醒时必填 |
| RESEND_DOMAIN  | Resend 配置的域名，不含`https://`前缀                   | 需要自动阅读暂停提醒时必填 |
| DATABASE_URL   | 记录日志，格式为: `postgresql://xxx`                  | 选填            |
| CRON_KEY       | cron任务的key (自定义的随机字符串，在下面的触发器任务中使用)           | 使用cron任务时必填   |


<details>
<summary>获取 RESEND_API_KEY 和 RESEND_DOMAIN</summary>

注册 https://resend.com/ 账号，然后添加一个 API key，如下图：

![resend api key](assets/resend-api-key1.png)
![resend api key](assets/resend-api-key2.png)


想要正常发送邮件，还需要配置域名
![resend domain](assets/resend-domain1.png)
![resend domain](assets/resend-domain2.png)

按照这个配置你的域名，最终效果如下：
![resend domain result](assets/resend-domain-result.png)
</details>


<details>
<summary>获取 DATABASE_URL</summary>

注册 https://supabase.com/ 账号，创建一个新的项目，如下图：

![创建一个数据库项目](assets/new-database-project.png)

> **保存这个数据库密码，后面连接字符串需要使用**

等待项目创建成功后，进入**Project Settings**里面的**Database**：

![数据库配置入口](assets/database-entry.png)

找到 **连接字符串** 面板，切换到`URI`，这个就是`DATABASE_URL`。注意需要用上面保存的数据库密码替换里面的`[YOUR-PASSWORD]`部分。

![连接字符串](assets/connect-string.png)
</details>

完整的环境变量配置如下：

![环境变量配置](assets/env.png)

### 4. 设置定时任务
自动阅读和兑换体验卡都需要定时任务来触发执行，目前deno deploy自己的消息队列不太好用，所以采用 cloudflare 的 worker 来作为定时任务的触发器。

#### 自动阅读的触发器
在 CloudFlare 控制台添加一个 worker，代码如下：
```js
export default {
    async scheduled(event, env, ctx) {
        // 注意：此处的域名替换成你自己部署的域名，CRON_KEY 替换成上面环境变量配置的 CRON_KEY
        const resp = await fetch('https://[your.domain.com]/cron/read/v2?key=[CRON_KEY]')
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
        // 注意：此处的域名替换成你自己部署的域名，CRON_KEY 替换成上面环境变量配置的 CRON_KEY
        const resp = await fetch('https://[your.domain.com]/cron/exchange-awards?key=[CRON_KEY]')
        console.log(await resp.text())
    },
};
```
触发周期设置为 `30 15 * * sun`(北京时间每周日晚11点30分)，如下图所示：
![兑换体验卡的触发器](assets/cron-exchange.png)


### 5. 后续更新操作
如果发现 fork 的版本比源版本落后，需要更新到最新版本时，只需要在 github 更新仓库代码即可，不需要删除 deploy 上面的项目重新 fork。

![fork版本是最新版本](assets/fork-is-latest.png)
上面这个图表示当前 fork 的代码是最新版本，不需要更新。

![fork版本是落后版本](assets/fork-is-behind.png)
上面这个图表示当前 fork 的代码落后源版本1个版本，可以点击右边的**Sync fork**更新代码，如下图所示：

![更新fork版本](assets/update-fork.png)

更新完之后，deploy 上面会自动重新部署最新版本。


## 特别注意

### 1. 关于付费内容
本项目不支持下载 **需要付费才能查看** 的内容，该内容通常表现为每章只有开头的一段内容，后面跟着省略号，如下图所示：

![需要付费才能查看的内容](assets/incomplete.png)

### 2. 关于双重验证码

扫码登录时会提示下面的二次确认，但实际上并不需要输入这个验证码也可以登录成功。

![登录时二次确认](assets/login.png)

这个应该是属于微信读书的bug，后续如果微信读书调整的话，我再跟进处理这个问题。


## 后续计划

- 解决 issue 中的 bug 及提出的优化点；
- 优化网站样式；
- 优化 epub 格式；
- <del>导出书籍中的的笔记/划线；</del>


## Stargazers over time

[![Stargazers over time](https://starchart.cc/champkeh/wereadx.svg)](https://starchart.cc/champkeh/wereadx)
