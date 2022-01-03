import { Type } from "class-transformer";
import { AbstractNode } from "../../app/overview/AbstractNode";

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
            property: 'nodetype',
            subTypes: [
                { value: FolderNode, name: 'folder' },
            ],
        },
    })
    public children: Array<this> = [];
}