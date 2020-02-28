require('./Math');

CanvasRenderingContext2D.prototype.setFillColorRgb = function setFillColorRgb(rgb) {
    this.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
};
