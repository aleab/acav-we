type Point = { x: number; y: number };

export function stroke(canvasContext: CanvasRenderingContext2D, thickness: number) {
    canvasContext.lineCap = 'round';
    canvasContext.lineJoin = 'round';
    canvasContext.lineWidth = thickness;
    canvasContext.stroke();
}

export function getCurveToPoints(prev: Point, to: Point, next: Point | null, smoothness: number) {
    if (smoothness <= 0) return [ prev, to ];

    return [
        {
            x: Math.lerp(prev.x, to.x, 0.5 * smoothness),
            y: Math.lerp(prev.y, to.y, 0.5 * smoothness),
        },
        next !== null ? {
            x: Math.lerp(to.x, next.x, 0.5 * smoothness),
            y: Math.lerp(to.y, next.y, 0.5 * smoothness),
        } : to,
    ];
}

export function curveTo(canvasContext: CanvasRenderingContext2D, prev: Point, to: Point, next: Point | null, curveEnd: Point, smoothness: number) {
    if (smoothness <= 0) {
        canvasContext.lineTo(to.x, to.y);
    } else if (next !== null) {
        canvasContext.quadraticCurveTo(to.x, to.y, curveEnd.x, curveEnd.y);
    } else {
        canvasContext.quadraticCurveTo(prev.x, prev.y, to.x, to.y);
    }
}
