export enum Pivot { Center, Top, Left, Bottom, Right, TopLeft, BottomLeft, BottomRight, TopRight }

const pivots = new Map<Pivot, [number, number]>([
    [ Pivot.Center, [ 0.5, 0.5 ] ],
    [ Pivot.Top, [ 0.5, 0.0 ] ],
    [ Pivot.Left, [ 0.0, 0.5 ] ],
    [ Pivot.Bottom, [ 0.5, 1.0 ] ],
    [ Pivot.Right, [ 1.0, 0.5 ] ],
    [ Pivot.TopLeft, [ 0.0, 0.0 ] ],
    [ Pivot.BottomLeft, [ 0.0, 1.0 ] ],
    [ Pivot.BottomRight, [ 1.0, 1.0 ] ],
    [ Pivot.TopRight, [ 1.0, 0.0 ] ],
]);

export function calculatePivotTransform(pivot: Pivot): { transform: string } {
    const pivotXY = pivots.get(pivot) ?? [ 0, 0 ];
    return { transform: `translate(${-pivotXY[0] * 100}%, ${-pivotXY[1] * 100}%)` };
}
