/**
 * This class is used for various Decorator classes.
 */
export type Constructor<T> = {
    new(...args: any[]): T;
    readonly prototype: T;
}
