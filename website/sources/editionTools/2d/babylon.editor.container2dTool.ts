module BABYLON.EDITOR {
    export class Container2DTool extends AbstractDatTool {
        // Public members
        public object: Container2D = null;
        public tab: string = "CONTAINER2D.TAB";

        // Private members
        private _currentDockX: string = "";
        private _currentDockY: string = "";
        private _resizeType: string = "";

        private _currentTexture: Texture = null;

        private _clipPlayDelay: number = 100;
        private _clipCount: number = 1;

        private _drawBefore: string = "";

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-CONTAINER-2D"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            return object instanceof Container2D;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Container 2D" });
        }

        // Update
        public update(): boolean {
            var object: Container2D = this.object = this._editionTool.object;
            var scene = this._editionTool.core.scene2d;
            var core = this._editionTool.core;

            super.update();

            if (!object)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            var displayFolder = this._element.addFolder("Display");

            // Draw order
            var friends: string[] = [];
            for (var i = 0; i < scene.meshes.length; i++) {
                var mesh = scene.meshes[i];
                if (mesh.parent === object.parent)
                    friends.push(mesh.parent.name);
            }

            this._element.add(this, "_drawBefore", friends).name("Draw before").onFinishChange((result: string) => {
                debugger;
            });

            // Docking
            if (!object.dock)
                object.dock = Dock.LEFT | Dock.BOTTOM;
        
            if (object.dock & Dock.LEFT)
                this._currentDockX = "LEFT";
            else if (object.dock & Dock.CENTER_HORIZONTAL)
                this._currentDockX = "CENTER_HORIZONTAL";
            else if (object.dock & Dock.RIGHT)
                this._currentDockX = "RIGHT";

            if (object.dock & Dock.TOP)
                this._currentDockY = "TOP";
            else if (object.dock & Dock.CENTER_VERTICAL)
                this._currentDockY = "CENTER_VERTICAL";
            else if (object.dock & Dock.BOTTOM)
                this._currentDockY = "BOTTOM";

            var dockingX: string[] = ["LEFT", "RIGHT", "CENTER_HORIZONTAL"];
            displayFolder.add(this, "_currentDockX", dockingX).name("Dock X").onFinishChange((result: string) => {
                object.dock = Dock[result] | Dock[this._currentDockY];
            });

            var dockingY: string[] = ["TOP", "BOTTOM", "CENTER_VERTICAL"];
            displayFolder.add(this, "_currentDockY", dockingY).name("Dock Y").onFinishChange((result: string) => {
                object.dock = Dock[this._currentDockX] | Dock[result];
            });

            // resize
            if (!object.resize)
                object.resize = Resize.NONE;
            
            var resizeType: string[] = ["NONE", "COVER", "CONTAIN", "FIT"];
            this._resizeType = resizeType[this.object.resize];

            displayFolder.add(this, "_resizeType", resizeType).name("Resize type").onFinishChange((result: string) => {
                object.resize = Resize[result];
                this.update();
            });

            if (object.resize === Resize.FIT) {
                displayFolder.add(object, "fitCoefficient").min(0).step(0.01).name("Fit coefficient");
            }

            // Pivot
            var pivotFolder = this._element.addFolder("Pivot");
            var pivot = object.getPivotPoint();
            
            pivotFolder.add(pivot, "x").min(0).max(1).step(0.01).name("x").onChange(() => object.setPivotPoint(pivot));
            pivotFolder.add(pivot, "y").min(0).max(1).step(0.01).name("y").onChange(() => object.setPivotPoint(pivot));

            // If clip
            if (object instanceof Clip2D) {
                var clipFolder = this._element.addFolder("Clip");
                clipFolder.open();

                clipFolder.add(this, "_clipPlayDelay").min(0).step(1).name("Clip delay").onChange(() => this._postClipAnimation());
                clipFolder.add(this, "_clipCount").min(0).step(1).name("Clip count").onChange(() => this._postClipAnimation());

                clipFolder.add(this, "_playClip").name("Play clip");
                clipFolder.add(this, "_pauseClip").name("Pause clip");
                clipFolder.add(this, "_stopClip").name("Stop clip");
            }

            // If sprite
            if (object instanceof Sprite2D) {
                this._currentTexture = object.textures[object.textureIndex];

                // Sprite
                var spriteFolder = this._element.addFolder("Sprite");
                this.addTextureFolder(this, "Texture", "_currentTexture", spriteFolder, false, () => {
                    (<Sprite2D>object).setTextures(this._currentTexture);
                }).open();

                if (!(object instanceof Clip2D)) {
                    this.addVectorFolder(object.textureOffset, "Texture offset", true, spriteFolder);
                    this.addVectorFolder(object.textureScale, "Texture zoom", true, spriteFolder);
                }
            
                // Drawing
                var drawingFolder = spriteFolder.addFolder("Drawing");
                drawingFolder.open();

                drawingFolder.add(object, "invertY").name("Invert Y");
            }

            if ((object instanceof Container2D && !(object instanceof Sprite2D)) || object instanceof Clip2D) {
                var dimensionsFolder = this._element.addFolder("Dimensions");
                dimensionsFolder.open();

                dimensionsFolder.add(object, "width").min(0).step(0.01).name("Width");
                dimensionsFolder.add(object, "height").min(0).step(0.01).name("Height");
            }

            return true;
        }

        // Plays the clip
        private _playClip(): void {
            var object = <Clip2D>this.object;
            object.play(this._clipPlayDelay, this._clipCount);
        }

        // Pauses the clip
        private _pauseClip(): void {
            var object = <Clip2D>this.object;
            object.pause();
        }

        // Stops the clip
        private _stopClip(): void {
            var object = <Clip2D>this.object;
            object.stop();
        }

        // On post configure clip animation
        private _postClipAnimation(): void {
            var object = <Clip2D>this.object;
            if (object.isPlaying)
                object.play(this._clipPlayDelay, this._clipCount);
        }
    }
}