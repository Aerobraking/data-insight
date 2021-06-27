
/**
 * Base class for all entries that are placeable in a workspace.
 */
export abstract class AbstractEntry {

    name?: string | number;
    id?: string | number;
    x?: number;
    y?: number;

    abstract getName(): string;

}
