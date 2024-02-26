import type {Bot} from "mineflayer";

// TODO: BlockFace should be from here (0 to 5)
import { Block } from "prismarine-block";
import type { Vec3 } from "vec3";

import type {PointsMaterialParameters} from 'three'


interface BotViewerEvents {
    blockClicked: (block: Block, face: number, button: number) => void;
    onRender: (fps: number) => void;
}

interface BotViewer {
    erase: (id: string) => void;
    drawBoxGrid: (id: string, start: Vec3, end: Vec3, color: PointsMaterialParameters) => void;
    drawLine: (id: string, points: Vec3[], color?: PointsMaterialParameters) => void;
    drawPoints: (id: string, points: Vec3[], color?: PointsMaterialParameters, size?: number) => void;
    close: () => void;
}


declare module 'mineflayer' {
    interface Bot {
        viewer: BotViewer;
    }
}


export function mineflayer(bot: Bot, settings: {
    viewDistance?: number;
    firstPerson?: boolean;
    port?: number;
    prefix?: string;
});

export function standalone(options: {
    version: versions;
    world: (x: number, y: number, z: number) => 0 | 1;
    center?: Vec3;
    viewDistance?: number;
    port?: number;
    prefix?: string;
});

export function headless(bot: Bot, settings: {
    viewDistance?: number;
    output?: string;
    frames?: number;
    width?: number;
    height?: number;
    logFFMPEG?: boolean;
    jpegOption: any;
});

export const viewer: {
    Viewer: any;
    WorldView: any;
    MapControls: any;
    Entitiy: any;
    getBufferFromStream: (stream: any) => Promise<Buffer>;
};

export const supportedVersions: versions[];
export type versions = '1.8.8' | '1.9.4' | '1.10.2' | '1.11.2' | '1.12.2' | '1.13.2' | '1.14.4' | '1.15.2' | '1.16.1' | '1.16.4' | '1.17.1' | '1.18.1';
