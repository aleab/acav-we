declare type DeepPartial<T> = import('utility-types').DeepPartial<T>;
declare type DeepReadonly<T> = import('utility-types').DeepReadonly<T>;
declare type NonUndefined<A> = import('utility-types').NonUndefined<A>;
declare type OptionalKeys<T> = import('utility-types').OptionalKeys<T>;

declare type PickOptional<T> = {
    [P in OptionalKeys<T>]: T[P];
};

declare type PickRequiredOptional<T> = {
    [P in OptionalKeys<T>]: NonUndefined<T[P]>;
};
