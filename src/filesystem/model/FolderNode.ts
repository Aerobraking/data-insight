import { AbstractNode } from "@/core/model/fileactivity/overview/AbstractNode";
import { Type } from "class-transformer"; 

/**
 * The AbstractNode implementation for a Folder does not need any special functionality.
 */
export default class FolderNode extends AbstractNode {
    constructor(name: string) {
        super("folder", name);
    }

    /**
     * Implement and add Typing to the childrens list, see comments in abstract class for more informations.
     */
    @Type(() => AbstractNode, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'nt',
            subTypes: [
                { value: FolderNode, name: 'folder' },
            ],
        },
    })
    public children: Array<this> = [];
}