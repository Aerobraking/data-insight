import { ImageDim } from "@/filesystem/utils/ImageCache";

/**
 * When your WorkspaceEntry has an "default" aspectratio, like an image with a resolution
 * has it because of its width/height, you can implement this interface. That makes it 
 * possible for the user to recover this default aspect ratio by an action in the WorkspaceView.
 */
export default interface WorkspaceEntryAspectRatio {
    /**
     * The default aspectratio for this WorkspaceEntry. Only the ratio property inside ImageDim
     * is required for that to work.
     */
    aspectratio: ImageDim | undefined;
}
