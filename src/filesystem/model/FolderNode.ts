import { AbstractNode } from "@/core/model/workspace/overview/AbstractNode";
import { Type } from "class-transformer"; 

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