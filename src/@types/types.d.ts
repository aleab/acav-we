import { NonUndefined, OptionalKeys } from 'utility-types';

export declare type PickOptional<T> = {
    [P in OptionalKeys<T>]: T[P];
};

export declare type PickRequiredOptional<T> = {
    [P in OptionalKeys<T>]: NonUndefined<T[P]>;
};
