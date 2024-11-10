# 使用说明
## 启动命令
1. 安装依赖
```
# 在windows下可能会有问题，尽量使用linux或mac，如果出问题就是wechaty依赖问题，可以尝试安装puppeteer
npm install
```
2. 启动
```
node index.js
```
或者通过docke启动
```
sudo docker run -p 3000:3000 -e REDIS_HOST=192.168.3.106  -e REDIS_PORT=6379  -e WECHATY_NAME=wechat-bot   -e HTTP_PORT=3000  -e DIFY_HOST=xxx  -e DIFY_API_KEY=xxx  lyle1024/wx-dify:v0.1 
```

3. 通过日志查看二维码链接，扫码登录
4. 通过日志查看消息发出者id，在白名单中添加该id，如果没有开启白名单，则可忽略


## DIFY
- 只能对接工作流，且工作流的入参和出参如下
```
input
{
  user_msg: "",
  fromType: "chatroom"/"friend",
  from_user_name: "",
  history_context:"[]",
  isVip: -1/1
}


output
{
  "data": "response",
  "reply": 1/0,
  "imgs": ["url"]
}
```

## 白名单
- ENABLE_WHITELIST=true/false，默认false，如果开启，则只有添加过白名单的用户才可以聊天
- WHITELIST_KEYWORDS配置私聊白名单，把对方备注名中包含这些关键词的添加到白名单
- ROOM_LIST群名称白名单，逗号隔开
- VIP_ROOM_LIST群名称白名单，逗号隔开

## Mattermost
- 这个配置是可选的，如果需要将消息同步到mattermost，则需要配置
- 在mattermost中创建机器人，并获取token
- 在.env中配置MATTERMOST_HOST, MATTERMOST_API_KEY, MATTERMOST_CHANNEL_ID

## 依赖
- litesql
- redis
- mattermost(可选)

## 鸣谢
- [wechaty](https://github.com/wechaty/wechaty)

- [Dify](https://github.com/langgenius/dify)