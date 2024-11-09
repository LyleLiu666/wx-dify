# 使用说明
## dify
- 只能对接工作流，且工作流的入参和出参如下
```
input
{
  user_msg: "",
  fromType: "chatroom"/"friend",
  from_user_name: "",
  history_context:"[]":
}


output
{
  "data": "response",
  "reply": 1/0,
  "imgs": ["url"]
}
```

## 白名单
只有添加过白名单的用户才可以聊天
管理员使用命令`/whitelist add talkerId user(或room)`添加
`/whitelist list user`或`/whitelist list room`查看白名单
