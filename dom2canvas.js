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