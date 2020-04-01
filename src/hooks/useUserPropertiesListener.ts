import { DependencyList, useContext, useEffect } from 'react';

import WallpaperContext from '../app/WallpaperContext';

export default function useUserPropertiesListener<P>(
    propSelector: (mp: DeepReadonly<MappedProperties>) => P,
    callback: (p: NonNullable<P>) => void,
    deps: DependencyList,
) {
    const context = useContext(WallpaperContext);
    useEffect(() => {
        const userPropertiesChangedCallback = (args: UserPropertiesChangedEventArgs) => {
            const props = propSelector(args.newProps);
            if (props !== undefined) {
                callback(props!);
            }
        };

        context?.wallpaperEvents.onUserPropertiesChanged.subscribe(userPropertiesChangedCallback);
        return () => {
            context?.wallpaperEvents.onUserPropertiesChanged.unsubscribe(userPropertiesChangedCallback);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ context, ...deps ]);
}
