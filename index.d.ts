import {Bot} from "mineflayer";

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
    jpegOption?: any;
    numWorkers?: number;
});

export interface HostImage {
    width: number;
    height: number;
    /** RGBA bytes, top row first */
    data: Uint8Array;
}

export interface HostWorker {
    postMessage(msg: any, transfer?: ArrayBuffer[]): void;
    onMessage(cb: (msg: any) => void): void;
    terminate(): void;
}

/** Everything the viewer needs from its platform */
export interface Host {
    loadImage(name: string): Promise<HostImage>;
    loadJSON(name: string): Promise<any>;
    createWorker(): HostWorker;
    now(): number;
    renderText?: ((text: string) => HostImage | null) | null;
}

export interface ViewerOptions {
    host?: Host;
    numWorkers?: number;
}

export const viewer: {
    Viewer: any;
    WorldView: any;
    MapControls: any;
    Entity: any;
    getBufferFromStream: (stream: any) => Promise<Buffer>;
    defaultHost: () => Host;
    createNodeHost: (options?: { assetsDir?: string; fetch?: typeof fetch; workerFile?: string }) => Host;
    createBrowserHost: (options?: { assetsUrl?: string; workerUrl?: string; textureProxy?: string | null }) => Host;
    createElectronHost: (options?: { assetsDir?: string; workerUrl?: string }) => Host;
};

export const supportedVersions: versions[];
export type versions = '1.8.8' | '1.9.4' | '1.10.2' | '1.11.2' | '1.12.2' | '1.13.2' | '1.14.4' | '1.15.2' | '1.16.1' | '1.16.4' | '1.17.1' | '1.18.1';
