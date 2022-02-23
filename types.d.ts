/**
 * @name prismarine-viewer
 * @see https://github.com/PrismarineJS/prismarine-viewer/blob/master/README.md
 */
declare module 'prismarine-viewer' {
  import { Bot as mineBot } from 'mineflayer';
  import { Vector3, WebGLRenderer } from 'three';
  import * as prischunk from 'prismarine-chunk';
  import { Entity } from 'prismarine-entity';

  export type GameVersion =
    /** Stable Versions */
    | `1.${number}.${number}`
    | `1.${number}`
    /** Release Candidate Versions */
    | `1.${number}.${number}-rc${number}`
    | `1.${number}-rc${number}`
    /** Prerelease versions */
    | `1.${number}.${number}-pre${number}`
    | `1.${number}-pre${number}`
    /** Snapshot Versions */
    | `${number}w${number}a`;

  /** @see https://github.com/PrismarineJS/prismarine-viewer/tree/master/viewer */
  export interface Viewer {
    /** @constructor */
    Viewer(renderer: WebGLRenderer): unknown;
    /** Game Version */
    version: GameVersion;
    /**
     * Set Game Version
     * @see Viewer.version
     */
    setVersion(version: GameVersion): unknown;
    /** Add Chunk */
    addColumn(x: number, z: number, chunk: prischunk.CommonChunk): unknown;
    /** Remove Chunk */
    removeColumn(x: number, z: number): unknown;
    /** Sets a block */
    setBlockStateId(position: Vector3, stateId: number): unknown;
    /** Updates an entity */
    updateEntity(entity: Entity): unknown;
    /** Updates a primitive */ // can't find the threejs primitive type in autocomplete
    updatePrimitive(primitive: any): unknown;
    /**
     * Sets the first person camera
     * If `position` is null, only yaw and pitch will be updated.
     */
    setFirstPersonCamera(
      position: Vector3 | undefined | null | void,
      yaw: number,
      pitch: number,
    ): unknown;
    /**
     * listen to an emitter and applies its modification the emitter should emit these events:
     * @see https://github.com/PrismarineJS/prismarine-viewer/blob/master/viewer/README.md#listen-emitter
     * @todo add types for this
     */
    listen(emitter: any): any;
    /** Update the world. This need to be called in the animate function, just before the render. */
    update(): unknown;
    /** Returns a promise that resolve once all sections marked dirty have been rendered by the worker threads. Can be used to wait for chunks to 'appear'. */
    waitForChunksToRender(): unknown;
    /** Undocumented Function */
    drawLine(a: string, b: any, ...c: any[]): any;
  }

  export interface Bot extends mineBot {
    viewer?: Viewer;
  }

  /**
   * Mineflayer function options
   */
  export type MineflayerOptions = {
    /**
     * @description View radius, in chunks - Defaults to `6`
     * @default 6
     */
    viewDistance?: number;
    /**
     * @description Is the view first person? Defaults to `false`
     * @default false
     */
    firstPerson?: boolean;
    /**
     * @description Port to serve site on
     * @default 3000
     */
    port?: number;
  };
  /**
   * Serve a webserver allowing to visualize the bot surrounding, in first or third person. Comes with drawing functionalities.
   */
  export const mineflayer: (bot: Bot, options: MineflayerOptions) => unknown;
}
