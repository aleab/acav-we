import { useEffect, useMemo } from 'react';
import Renderer from '../app/Renderer';

export function useRenderer(fps?: number) {
    const renderer = useMemo(() => Renderer(fps), [fps]);
    useEffect(() => {
        renderer.start();
        return () => renderer.stop();
    }, [renderer]);

    return renderer;
}
