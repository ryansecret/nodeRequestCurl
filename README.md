---
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
# NODE 请求转换为curl

## 安装

```bash
$ npm i node_request_curl --save
```

## 使用说明

```js
  const recorder= require('node_request_curl');
  app.use( function(req,res,next) {

    recorder(record => {
      logger.info(`${record.time}`,`${record.request}`)

      logger.info(
        `${record.error || record.response}`
      );
    });
    next()
  })
```
作为一个middleware 使用。可设置环境变量，根据设置是否启用。


## 联系

有问题请提 [issue](https://github.com/ryansecret/nodeRequestCurl/issues).

## License

[MIT](LICENSE)
