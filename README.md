# jQuery.regionPicker

功能最全的仿淘宝、京东 js 三级四级多级联动地区选择插件 regionPicker PC端/手机移动端，提供支持全国和全世界的mysql数据。

Github 开源地址：[https://github.com/Copterfly/regionPicker][1]

## 特点

最大的特点是：**丰富的调用参数和各种体贴入微的功能，满足各种项目的变态需求。**

具体如下：

- 支持PC端和手机移动端（采用虚拟页面形式）。
- PC端支持两种形式：1、仿淘宝弹层形式；2、`select` 下拉菜单形式。
- 支持 `1-4` 级地区联动(国家/省份/城市/县区)，可自定义合理的级别范围。
- 弹层模式时，`国家/省份` 这两级数据可按名称首拼分组。
- 支持动态异步数据和单纯使用静态数据两种形式。
- 支持自定义数据结构 `key`，方便跟您现有地区数据无缝结合。
- 支持同一页面实例化 `N` 个插件。
- 提供全世界多级地区数据(`MySQL`)，但不保证数据正确性，请谨慎用于生产环境。
- 支持自定义弹层类名，可以非常方便地定制插件样式。
- 选择时（popup 的地区被点击时 或 select 下拉框被选择时）的回调，提供了所选择的层级数据（包括：地区名称、id、是否是最后一级），方便给表单隐藏域赋值，以及验证是否已经选到要求的层级等。
- 弹层关闭时的回调参数同上。
- select下拉菜单形式可设置为选了上一级才出现下一级的形式。
- 更多惊喜请慢慢体验...

![regionPicker地区选择插件.png][2]

## demo 及文档

[http://www.copterfly.cn/demos/js/jquery.regionPicker/][3]

## 更多介绍及博客留言

[http://www.copterfly.cn/front-end/jquery/regionPicker.html][4]

## 文件结构说明

```
jquery.regionPicker 目录结构：
│
│  index.html ----------------- 插件 demo 及文档
│  jquery.regionPicker.css ---- 插件 css
│  jquery.regionPicker.js ----- 插件 js
│  
├─images --------------------- 插件用到的图片
│      item-current.png
│      item-normal.png
│      loading.gif
│      
└─php
    │  ajax.php --------------- php 数据接口文件(已经写好了读取地区数据的相关逻辑)
    │  
    │  region.sql ------------- MySQL 数据
    │  
    └─ezSQL ------------------ ezSQL 相关文件(数据库相关操作用)
```

如果使用 `php/ajax.php` 文件作为您的数据接口的话，请在如下位置自行配置好数据库相关信息。

```
/*-----------------------------------------------
 如果使用此文件，请先务必根据自己的数据库填写以下信息！
-----------------------------------------------*/
$db = new ezSQL_mysql('数据库用户名','密码','数据库名','数据库地址', 'utf8');
```

## Copyright

MIT



  [1]: https://github.com/Copterfly/regionPicker
  [2]: http://www.copterfly.cn/usr/uploads/2018/06/4176129274.png
  [3]: http://www.copterfly.cn/demos/js/jquery.regionPicker/
  [4]: http://www.copterfly.cn/front-end/jquery/regionPicker.html

