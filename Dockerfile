FROM ghcr.nju.edu.cn/puppeteer/puppeteer:latest
USER pptruser

# 设置工作目录
WORKDIR /app

# 复制应用代码到容器中
COPY . /app



# 更改文件归属为pptruser用户
USER root
RUN chown -R pptruser:pptruser /app

USER pptruser


EXPOSE 3000

# 启动应用
CMD ["node", "index.js"]