﻿/**
* Definitions
*/

declare interface IStringDictionary<T> {
    [index: string]: T;
}

declare interface INumberDictionary<T> {
    [index: number]: T;
}

/**
* Babylon.js Editor
*/
declare module BABYLON.EDITOR {
    /**
    * Custom Update Interface
    */
    interface ICustomUpdate {
        /**
        * Called before rendering the scene(s)
        */
        onPreUpdate(): void;
        /**
        * Called after the scene(s) was rendered
        */
        onPostUpdate(): void;
    }

    /**
    * Custom Scenes
    */
    interface ICustomScene {
        /**
        * If render the scene or not
        */
        render: boolean;
        /**
        * The scene to render
        */
        scene: Scene;
    }

    /**
    * IEvent interface
    */
    interface IEvent
    {
        eventType: EventType;

        // GUI
        guiEvent: GUIEvent;

        // Scene
        sceneEvent: SceneEvent;
    }

    /**
     * IEventEmitter interface
     */
    interface IEventEmitter {
        /**
         * Famous "on" method :)
         */
        on<T>(eventName: string, callback: (data: T) => void): void;
    }

    /**
    * Event Receiver interface
    */
    interface IEventReceiver {
        // Classic event callback with IEvent structure
        onEvent?(event: IEvent): boolean;

        // on event
        on?(emitter: IEventEmitter): void;
    }

    /**
    * Custom Edition Tools
    */
    interface ICustomEditionTool {
        /**
        * The object to modify
        */
        object: Object;

        /**
        * DOM element ID to create
        */
        containers: Array<string>;
        /**
        * Tabs ids
        */
        tab: string;
        /**
        * Returns if the object is supported by the tool
        */
        isObjectSupported(object: any): boolean;
        /**
        * Creates the tool's UI
        */
        createUI(): void;
        /**
        * Update forms
        */
        update(): boolean;
        /**
        * Apply values to object
        */
        apply(): void;
        /**
        *
        */
        resize(): void;
    }

    /**
    * Custom main toolbar plugin
    */
    interface ICustomToolbarMenu {
        /**
        * The ID of the menu
        */
        menuID: string;

        /**
        * Called when a menu item is selected by the user
        * @param selected: the id of the selected menu item
        */
        onMenuItemSelected(selected: string): void;
    }

    /**
    * Interface which must be implemented by applications
    * using a custom tab (cf. Actions Builder V2)
    */
    interface ITabApplication extends IDisposable {
        /**
        * Called when tab application is focused back
        */
        onFocus?(): void;

        /**
        * If the application has focus
        */
        hasFocus?: boolean;
    }
}

/**
* Definitions file parsing
*/
declare module BABYLON.EDITOR {
    /**
    * IDocEntry which comes from the TypeScriptParser project
    */
    interface IDocEntry {
        name?: string;
        fileName?: string;
        documentation?: string;
        type?: string;

        classes?: IDocEntry[];
        constructors?: IDocEntry[];

        functions?: IDocEntry[];
        functionBody?: IDocEntry[];

        parameters?: IDocEntry[];
        properties?: IDocEntry[];

        entryType?: string;
        moduleName?: string;

        heritageClauses?: string[];
    }
}
