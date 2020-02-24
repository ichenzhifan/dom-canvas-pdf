## 简介
最近有这样的一个需求, 需要将产品的原始数据, 导出生成工程图. 其中工程图中, 就包括复杂的表格.

如果你对canvas有基本的了解， 就了解, 如果只是要画一些简单的图形, 比如基本图形, 曲线, 柱状图, 圆等. 其实不难. 但如果两个图形之间有约束关系, 比如table中的单元格,单元格里面的文字，很容易的做到根据单元格的宽度自动换行. 文本的左右对齐, 上下对齐. 等等这些功能, 要在canvas中实现, 似乎不太容易.

## 实现思路
了解到canvas的特点, 以及上面提到的问题. 我们换一种思路, 能否利用dom中的table实现渲染, 然后将dom节点转化为canvas呢? 事实上是可行的, 比如现有的框架html2canvas.

## 实现的具体方案
- 原始数利用dom的table做渲染.
- 利用svg中的foreignObject，该作用是可以在其中使用具有其它XML命名空间的XML元素，换句话说借助<foreignObject>标签，我们可以直接在SVG内部嵌入XHTML元素. 举个例子:
``` html
<svg xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="120" height="50">
      <body xmlns="http://www.w3.org/1999/xhtml">
        <p>文字。</p>
      </body>
    </foreignObject>
</svg>
```
可以看到<foreignObject>标签里面有一个设置了xmlns="http://www.w3.org/1999/xhtml"命名空间的<body>标签，此时<body>标签及其子标签都会按照XHTML标准渲染，实现了SVG和XHTML的混合使用。

这种混合特性有什么作用呢？作用很多，其中之一就是轻松实现SVG内的文本自动换行，左右对齐, 上下对齐等样式。
- 将svg, 转成canvas绘制.
- canvas导出成工程图(pdf).

## 具体的核心实现 
``` js
/**
 * 将dom节点转化为canvas, pdf
 * @param {HTMLElement} dom 
 * @param {String} backgroundColor 
 */
function Dom2Canvas(dom, backgroundColor) {
  this.dom = dom;
  this.backgroundColor = backgroundColor;
  this.canvas = null;
  this.ctx = null;
  this.width = 0
  this.height = 0;
  this.data = null;

  this.init();
}

/**
 * 初始化实例变量.
 */
Dom2Canvas.prototype.init = function () {
  this.width = this.dom.clientWidth;
  this.height = this.dom.clientHeight;

  // 初始化canvas
  this.canvas = document.createElement('canvas');
  this.ctx = this.canvas.getContext('2d');
  this.canvas.width = this.width;
  this.canvas.height = this.height;
  if (!this.backgroundColor) {
    this.backgroundColor = this.dom.style.backgroundColor || '#ffffff';
  }

  // 添加一个默认的矩形, 防止导出时, canvas的透明的.
  this._addBackgroundRect();

  // 添加xmlns, 按照XHTML标准渲染，实现了SVG和XHTML的混合使用
  this._addNamespace();

  this.data = `<svg xmlns='http://www.w3.org/2000/svg' width='${this.width}' height='${this.height}'>
      <foreignObject width='100%' height='100%'> ${this.dom.outerHTML}</foreignObject>
    </svg>`;
};

/**
 * 设置了xmlns="http://www.w3.org/1999/xhtml"命名空间，dom标签及其子标签都会
 * 按照XHTML标准渲染，实现了SVG和XHTML的混合使用。
 */
Dom2Canvas.prototype._addNamespace = function () {
  this.dom.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
}

/**
 * 添加一个默认的矩形, 防止导出时, canvas的透明的.
 */
Dom2Canvas.prototype._addBackgroundRect = function () {
  this.ctx.save();
  this.ctx.fillStyle = this.backgroundColor;
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  this.ctx.restore();
};

/**
 * 将dom转化为canvas
 */
Dom2Canvas.prototype.toCanvas = function (cb) {
  // hack: instead of a blobURL, if we use a dataURL, chrome seems happy...
  const url = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(this.data);
  const image = new Image();
  const that = this;

  image.onload = function () {
    that.ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);

    cb && cb(that.canvas);
  }

  image.src = url;
};

/**
 * 将dom转化为pdf
 */
Dom2Canvas.prototype.toPdf = function (fileName) {
  this.toCanvas(function (canvas) {
    // only jpeg is supported by jsPDF
    // const imgData = canvas.toDataURL("image/jpeg", 1.0);
    const pdf = new jsPDF();

    pdf.addImage(canvas, 'JPEG', 0, 0);
    pdf.save(`${fileName}.pdf`);
  });
};
```

## 如何使用
``` html
<head>
  <script src="./jspdf.js"></script>
  <script src="./dom2canvas.js"></script>
</head>

<body>
  <button id="btn">export to pdf</button>

  <div id="table">
      <table style="width: 200px;" border="1">
        <thead>
          <th>id</th>
          <th>name</th>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>test1</td>
          </tr>
          <tr>
            <td>2</td>
            <td>test2</td>
          </tr>
        </tbody>
      </table>
  </div>

  <script>
    window.onload = function () {
      const table = document.getElementById('table');
      const btn = document.getElementById('btn');

      btn.onclick = function () {
        const instance = new Dom2Canvas(table);
        instance.toPdf(Date.now());
      }
    };
  </script>
</body>
</html>
```

## 部分代码解释
- 定义了一个Dom2Canvas类, 需要传递两个参数
    - dom节点: 期望绘制到canvas中的dom节点, 例子中设置的table节点
    - backgroundColor: canvas的背景色, 可以自定义， 默认值是白色.
- 构造函数中, 执行init方法. 参数的初始化.
    - dom节点的宽高信息, 用于设置新canvas的尺寸
    - 创建一个新的canvas, 用于绘制dom节点.
    - 在canvas中线绘制一个默认的矩形, 其实就是绘制一个canvas的底色. 因为默认canvas导出时是透明色.
    - 给dom节点添加xmlns命名空间, 按照XHTML标准渲染，实现了SVG和XHTML的混合使用, 一般使用的就是http://www.w3.org/1999/xhtml
    - 初始化data属性, 将dom节点转化为svg节点.
- toCanvas实例方法: 将svg节点转化为canvas.
- toPdf实例方法: 借助jsPdf类库, 将canvas转化为pdf.

## 注意事项
- dom中设置样式, 需要通过节点属性style, 不能使用class
- 由于我们使用了svg的foreignObject, 将canvas导出成pdf时，会失败, 涉及到安全策略问题. 我们使用了一个hack.
```
// hack: instead of a blobURL, if we use a dataURL.
const url = 'data:image/svg+xml; charset=utf8, '+ encodeURIComponent(this.data);
```

## 其他
- 关于foreignObject标签的介绍, 可以参考 [SVG foreignObject>简介与截图等应用](https://www.zhangxinxu.com/wordpress/2017/08/svg-foreignobject/)
- Canvas导出成pdf, 借助jsPdf类库.

## 代码
[dom-canvas-pdf](https://github.com/ichenzhifan/dom-canvas-pdf)
