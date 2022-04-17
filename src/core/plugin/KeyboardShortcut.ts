
/**
 * The following code is based on this example:
 * https://betterprogramming.pub/full-featured-hotkeys-library-in-200-lines-of-javascript-code-81a74e3138cc
 * 
 * The code is quite messy and needs to be refractored to match well TypeScript Code, but it does the job already.
 *  
 */

/**
 * An Instance of this Interface represents one keyboard input. When its rawHotkey fits to the
 * current Input, its callback method will be called.
 */
export interface HotKey {
    /**
     * This string represents the input that trigges the callback method.
     * Examples:
     * "ctrl s"
     * "shift alt 2"
     * "cmdorctrl e"
     */
    rawHotkey: string,
    /**
     * A array representation of the rawHotkey string.
     */
    hotkey: { [any: string]: boolean },
    /**
     * ws: The input happens inside the WorkspaceView.
     * ov: The input happens inside the OverviewView.
     * global: THe input happens anywhere in the app.
     */
    context: "ws" | "ov" | "global",
    callback: (e: KeyboardEvent) => void
}

/**
 * Handles the given Input and calls the registered HotKey Instances that fit to the input.
 * Create an Instance of this Interface with the createKeyboardInputContext and pass the keydown
 * events to it. Before that, register the Plugins in the instance.
 */
export interface PluginShortCutHandler {
    /**
     * Call this method in your Component when you want to trigger Plugins by keydown events.
     */
    keydown: (context: "ws" | "ov" | "global", event: KeyboardEvent) => void,
    /**
     * Registers a HotKey by the given string.
     */
    register: (hotkey: string, callback: () => void) => void,
    /**
     * Unregister the given callback method by the given hotkey string.
     */
    unregister: (hotkey: string, callback: () => void) => void,
}

/**
 * Creates an Instace of the PluginShortCutHandler that processes the Input.
 * @param options 
 * @returns 
 */
export const createKeyboardInputContext = (options: { debounceTime: number, autoEnable: boolean }): PluginShortCutHandler => {
    const { debounceTime, autoEnable } = validateContext(options);

    const listeners: HotKey[] = [];
    const keyDownListener = createKeyDownListener(
        listeners, debounceTime,
    );

    return {
        keydown: keyDownListener,
        register: createListenersFn(listeners, registerListener),
        unregister: createListenersFn(listeners, unregisterListener),
    };
};

const isEqual = (a: any, b: any) => {
    const aKeys = Object.keys(a);

    if (aKeys.length !== Object.keys(b).length) {
        return false;
    }

    return aKeys.every(
        (k) => Object.prototype.hasOwnProperty.call(b, k)
            && a[k] === b[k],
    );
};

const isArrayEqual = (a: any, b: any[]) => a.length === b.length
    && a.every((v: any, i: any) => isEqual(v, b[i]));

const matchHotkey = (buffer: any, hotkey: any) => {
    if (buffer.length < hotkey.length) {
        return false;
    }

    const indexDiff = buffer.length - hotkey.length;
    for (let i = hotkey.length - 1; i >= 0; i -= 1) {
        if (!isEqual(buffer[indexDiff + i], hotkey[i])) {
            return false;
        }
    }

    return true;
};

function arrayToObject(arr: any[]): { [any: string]: boolean } {
    return arr.reduce(
        (obj: any, key: any) => ({ ...obj, [key]: true }),
        {},
    )
};

const allModifiers: string[] = ['ws', 'global', 'ov', 'ctrl', 'cmdorctrl', 'cmd', 'shift', 'alt', 'meta'];
const indexedModifiers = arrayToObject(allModifiers);

const isHotkeyValid = (hotkey: any) => Object.keys(hotkey)
    .filter((k) => !indexedModifiers[k])
    .length === 1;

const validate = (value: boolean, message: string) => {
    if (!value) {
        throw new Error(message);
    }
};

const validateType = (value: any, name: any, type: any) => {
    validate(
        typeof value === type,
        `The ${name} must be a ${type}; given ${typeof value}`,
    );
};

function normalizeHotkey(hotkey: any): { [any: string]: boolean } {
    return hotkey.split(/ +/g).map(
        (part: any) => {

            const arr = part.split('+').filter(Boolean);
            const result = arrayToObject(arr);

            validate(
                Object.keys(result).length >= arr.length,
                `Hotkey combination has duplicates "${hotkey}"`,
            );

            validate(
                isHotkeyValid(result),
                `Invalid hotkey combination: "${hotkey}"`,
            );

            return result;
        },
    )
};

const validateListenerArgs = (hotkey: any, callback: any) => {
    validateType(hotkey, 'hotkey', 'string');
    validateType(callback, 'callback', 'function');
};

const createListenersFn = (listeners: any, fn: any) => (hotkey: string, callback: () => void) => {
    hotkey = hotkey.replaceAll(
        "cmdorctrl",
        process.platform !== "darwin" ? "ctrl" : "cmd"
    );
    let context = hotkey.startsWith("ws") ? "ws" : hotkey.startsWith("ov") ? "ov" : "global";
    hotkey = hotkey.replaceAll("ws", "").replaceAll("ov", "").replaceAll("global", "");
    hotkey = hotkey.trim();

    let split = hotkey.split(" ");
    validateListenerArgs(hotkey, callback);
    fn(listeners, context, hotkey, callback);
};

const registerListener = (listeners: HotKey[], context: "ws" | "ov" | "global", hotkey: string, callback: (e: KeyboardEvent) => void) => {
    listeners.push({ rawHotkey: context + " " + hotkey, hotkey: normalizeHotkey(hotkey), context: context, callback: callback });
};

const unregisterListener = (listeners: any, hotkey: any, callback: Function) => {
    const normalized: { [any: string]: boolean } = normalizeHotkey(hotkey);

    const index = listeners.findIndex(
        (l: any) => l.callback === callback
            && isArrayEqual(normalized, l.hotkey),
    );

    if (index !== -1) {
        listeners.splice(index, 1);
    }
};

const debounce = (fn: Function, time: number) => {
    let timeoutId: number | null = null;

    return () => {
        timeoutId ? clearTimeout(timeoutId) : "";
        timeoutId = setTimeout(fn, time);
    };
};

const getKey = (key: string) => {
    switch (key) {
        case '+':
            return 'plus';
        case ' ':
            return 'space';
        default:
            // may be an uppercased letter, in case the shift is active
            return key.toLowerCase();
    }
};

const createKeyDownListener = (listeners: HotKey[], debounceTime: number) => {
    let buffer: any[] = [];

    // clear buffer after given time
    const clearBufferDebounced = debounce(
        () => { buffer = []; },
        debounceTime,
    );

    return (context: "ws" | "ov" | "global", event: KeyboardEvent) => {

        if (event.repeat) {
            return;
        }

        if (event.getModifierState(event.key)) {
            return;
        }

        clearBufferDebounced();

        const description = {
            [getKey(event.key)]: true,
        };

        allModifiers.forEach((m) => {
            // @ts-ignore: Unreachable code error
            if (event[`${m}Key`]) {
                description[m] = true;
            }
        });


        buffer.push(description);

        listeners.forEach((listener: HotKey) => {
            if (matchHotkey(buffer, listener.hotkey) && (listener.context == context || listener.context == "global")) {
                listener.callback(event);
            }
        });
    };
};

const validateContext = (options: { debounceTime: number, autoEnable: boolean }) => {
    const { debounceTime = 500, autoEnable = true } = (options || {});

    validateType(debounceTime, 'debounceTime', 'number');
    validate(debounceTime > 0, 'debounceTime must be > 0');
    validateType(autoEnable, 'autoEnable', 'boolean');

    return { debounceTime, autoEnable };
};

