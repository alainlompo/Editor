﻿module BABYLON.EDITOR {
    var coordinatesModes = [
        { id: 0, text: "EXPLICIT_MODE" },
        { id: 1, text: "SPHERICAL_MODE" },
        { id: 2, text: "PLANAR_MODE" },
        { id: 3, text: "CUBIC_MODE" },
        { id: 4, text: "PROJECTION_MODE" },
        { id: 5, text: "SKYBOX_MODE" },
        { id: 6, text: "INVCUBIC_MODE" },
        { id: 7, text: "EQUIRECTANGULAR_MODE" },
        { id: 8, text: "FIXED_EQUIRECTANGULAR_MODE" }
    ];
    
    interface ITextureRow extends GUI.IGridRowData {
        name: string;
        width: number;
        height: number;
    }
    
    interface ISubTextureRow extends GUI.IGridRowData {
        name: string;
        value: string;
    }

    export class GUITextureEditor implements IEventReceiver {
        // Public members
        public object: Object;
        public propertyPath: string;

        // Private members
        private _core: EditorCore;

        private _targetObject: Object;
        private _targetTexture: BaseTexture = null;
        private _selectedTexture: BaseTexture = null;
        private _objectName: string;
        
        private _currentRenderTarget: RenderTargetTexture = null;
        private _currentPixels: Uint8Array = null;
        private _currentOnAfterRender: (faceIndex: number) => void;
        private _dynamicTexture: DynamicTexture = null;

        private _texturesList: GUI.GUIGrid<ITextureRow> = null;
        
        private _allowCubes: boolean;

        private _engine: Engine = null;
        private _scene: Scene = null;

        /**
        * Constructor
        * @param core: the editor core
        * @param object: the object to edit
        * @param propertyPath: the path to the texture property of the object
        */
        constructor(core: EditorCore, objectName?: string, object?: Object, propertyPath?: string, allowCubes?: boolean) {
            // Initialize
            this._core = core;
            this._core.eventReceivers.push(this);
            this._core.editor.editPanel.close();

            this.object = object;
            this.propertyPath = propertyPath;
            this._objectName = objectName;

            // Initialize object and property path
            if (object && propertyPath) {
                this._targetObject = object[propertyPath];

                if (!this._targetObject || !(this._targetObject instanceof BaseTexture)) {
                    this._targetObject = null;
                }
            }

            this._allowCubes = allowCubes === undefined ? true : allowCubes;

            // Finish
            this._createUI();
        }
        
        // On Event
        public onEvent(ev: Event): boolean {
            if (ev.eventType === EventType.SCENE_EVENT) {
                var eventType = ev.sceneEvent.eventType;
                
                if (eventType === SceneEventType.OBJECT_ADDED || eventType === SceneEventType.OBJECT_REMOVED || eventType === SceneEventType.NEW_SCENE_CREATED) {
                    this._fillTextureList();
                }
                else if (eventType === SceneEventType.OBJECT_CHANGED && ev.sceneEvent.object === this._selectedTexture) {
                    if (this._selectedTexture instanceof DynamicTexture)
                        (<DynamicTexture>this._targetTexture).update(true);
                }
            }
            
            else if (ev.eventType === EventType.GUI_EVENT) {
                if (ev.guiEvent.eventType === GUIEventType.LAYOUT_CHANGED) {
                    this._engine.resize();
                }
            }
            
            return false;
        }

        // Creates the UI
        private _createUI(): void {
            this._core.editor.editPanel.setPanelSize(40);

            // IDs and elements
            var texturesListID = "BABYLON-EDITOR-TEXTURES-EDITOR-TEXTURES";
            var canvasID = "BABYLON-EDITOR-TEXTURES-EDITOR-CANVAS";

            var texturesListElement = GUI.GUIElement.CreateDivElement(texturesListID, "width: 50%; height: 100%; float: left;");
            var canvasElement = GUI.GUIElement.CreateElement("canvas", canvasID, "width: 50%; height: 100%; float: right;");

            this._core.editor.editPanel.addContainer(texturesListElement, texturesListID);
            this._core.editor.editPanel.addContainer(canvasElement, canvasID);

            // Texture canvas
            this._engine = new Engine(<HTMLCanvasElement>$("#" + canvasID)[0], true);
            this._scene = new Scene(this._engine);
            this._scene.clearColor = new Color4(0, 0, 0, 1);

            var camera = new ArcRotateCamera("TextureEditorCamera", 0, 0, 10, Vector3.Zero(), this._scene);
            camera.attachControl(this._engine.getRenderingCanvas());

            var material = new StandardMaterial("TextureEditorSphereMaterial", this._scene);
            material.diffuseColor = new Color3(1, 1, 1);
            material.disableLighting = true;

            var light = new HemisphericLight("TextureEditorHemisphericLight", Vector3.Zero(), this._scene);
            
            var sphere = Mesh.CreateSphere("TextureEditorSphere", 32, 5, this._scene);
            sphere.setEnabled(false);
            sphere.material = material;

            var postProcess = new PassPostProcess("PostProcessTextureEditor", 1.0, camera);
            postProcess.onApply = (effect: Effect) => {
                if (this._targetTexture)
                    effect.setTexture("textureSampler", this._targetTexture);
            };

            this._engine.runRenderLoop(() => {
                this._scene.render();
            });

            // Textures list
            this._texturesList = new GUI.GUIGrid<ITextureRow>(texturesListID, this._core);
            this._texturesList.header = this._objectName ? this._objectName : "Textures ";
            this._texturesList.createColumn("name", "name", "100px");
            this._texturesList.createColumn("width", "width", "80px");
            this._texturesList.createColumn("height", "height", "80px");
            this._texturesList.showSearch = true;
            this._texturesList.showOptions = true;
            this._texturesList.showAdd = true;
            this._texturesList.hasSubGrid = true;
            this._texturesList.buildElement(texturesListID);
            
            this._fillTextureList();

            this._texturesList.onClick = (selected: number[]) => {
                if (selected.length === 0)
                    return;

                if (this._currentRenderTarget)
                    this._restorRenderTarget();
                
                var selectedTexture: BaseTexture = this._core.currentScene.textures[selected[0]];

                // Send event texture has been selected
                if (!this.propertyPath)
                    Event.sendSceneEvent(selectedTexture, SceneEventType.OBJECT_PICKED, this._core);

                // Configure texture to preview
                if (this._targetTexture) {
                    this._targetTexture.dispose();
                    this._targetTexture = null;
                }
                
                // If render target, configure canvas. Else, set target texture 
                if (selectedTexture.isRenderTarget && !selectedTexture.isCube) {
                    this._currentRenderTarget = <RenderTargetTexture>selectedTexture;
                    this._configureRenderTarget();
                }
                else {
                    if (!selectedTexture.name)
                        selectedTexture.name = (<any>selectedTexture).url;
                    
                    var serializationObject = selectedTexture.serialize();

                    if (selectedTexture instanceof DynamicTexture) {
                        this._targetTexture = new DynamicTexture(selectedTexture.name, { width: selectedTexture.getBaseSize().width, height: selectedTexture.getBaseSize().height }, this._scene, selectedTexture.noMipmap);

                        var canvas: HTMLCanvasElement = (<any>this._targetTexture)._canvas;
                        canvas.remove();

                        (<any>this._targetTexture)._context = (<any>selectedTexture)._context;
                        (<any>this._targetTexture)._canvas = (<any>selectedTexture)._canvas;
                        (<DynamicTexture>this._targetTexture).update(true);
                    }
                    else if (selectedTexture.name.indexOf("/") !== -1) {
                        this._targetTexture = Texture.Parse(serializationObject, this._scene, "");
                    }
                    else {
                        // Guess texture
                        if ((<any>selectedTexture)._buffer) {
                            serializationObject.base64String = (<any>selectedTexture)._buffer;
                        }
                        else {
                            var file: File = BABYLON.FilesInput.FilesToLoad[selectedTexture.name.toLowerCase()];
                            if (file) {
                                serializationObject.name = (<Texture>selectedTexture).url;
                            }

                            serializationObject.url = serializationObject.url || serializationObject.name;
                            if (serializationObject.url.substring(0, 5) !== "file:") {
                                serializationObject.name = "file:" + serializationObject.name;
                            }

                            if (!file && serializationObject.name.indexOf(".hdr") !== -1) {
                                this._targetTexture = new HDRCubeTexture(serializationObject.name, this._scene, serializationObject.isBABYLONPreprocessed ? null : serializationObject.size);
                                this._targetTexture.coordinatesMode = Texture.SKYBOX_MODE;
                            }
                        }

                        if (!this._targetTexture)
                            this._targetTexture = Texture.Parse(serializationObject, this._scene, "");
                    }
                }
                
                if (this.object && (this._allowCubes || selectedTexture.isCube === false)) {
                    this.object[this.propertyPath] = selectedTexture;
                }
                
                if (selectedTexture) {
                    this._selectedTexture = selectedTexture;
                    camera.detachPostProcess(postProcess);

                    if (selectedTexture.isCube && !selectedTexture.isRenderTarget) {
                        sphere.setEnabled(true);
                        material.reflectionTexture = this._targetTexture;
                    }
                    else {
                        sphere.setEnabled(false);
                        camera.attachPostProcess(postProcess);
                    }
                }
            };
            
            if (this.object && this.object[this.propertyPath]) {
                var index = this._core.currentScene.textures.indexOf(this.object[this.propertyPath]);
                if (index !== -1) {
                    this._texturesList.setSelected([index]);
                    this._texturesList.onClick([index]);
                    this._texturesList.scrollIntoView(index);
                }
            }

            this._texturesList.onAdd = () => {
                var inputFiles = $("#BABYLON-EDITOR-LOAD-TEXTURE-FILE");

                inputFiles[0].onchange = (data: any) => {
                    for (var i = 0; i < data.target.files.length; i++) {
                        var name: string = data.target.files[i].name;
                        var lowerName = name.toLowerCase();

                        if (name.indexOf(".babylon.hdr") !== -1) {
                            BABYLON.Tools.ReadFile(data.target.files[i], this._onReadFileCallback(name), null, true);
                        }
                        else if (name.indexOf(".hdr") !== -1) {
                            BABYLON.FilesInput.FilesToLoad[name] = data.target.files[i];
                            HDRCubeTexture.generateBabylonHDR("file:" + name, 256, this._onReadFileCallback(name), function () {
                                GUI.GUIWindow.CreateAlert("An error occured when converting HDR Texture", "HR Error");
                            });
                        }
                        else if (name.indexOf(".dds") !== -1) {
                            BABYLON.Tools.ReadFile(data.target.files[i], this._onReadFileCallback(name), null, true);
                        }
                        else if (lowerName.indexOf(".png") !== -1 || lowerName.indexOf(".jpg") !== -1) {
                            BABYLON.FilesInput.FilesToLoad[lowerName] = data.target.files[i];
                            BABYLON.Tools.ReadFileAsDataURL(data.target.files[i], this._onReadFileCallback(lowerName), null);
                        }
                        else {
                            GUI.GUIWindow.CreateAlert("Texture format not supported", "Textre Format Error");
                        }
                    }
                };
                inputFiles.click();
            };
            
            this._texturesList.onReload = () => {
                this._fillTextureList();
            };
            
            this._texturesList.onExpand = (id: string, recid: number) => {
                var originalTexture = this._core.currentScene.textures[recid];
                if (!originalTexture)
                    null;
                
                var subGrid = new GUI.GUIGrid<ISubTextureRow>(id, this._core);
                subGrid.showColumnHeaders = false;
                
                subGrid.createColumn("name", "Property", "25%", "background-color: #efefef; border-bottom: 1px solid white; padding-right: 5px;");
                subGrid.createColumn("value", "Value", "75%");
                
                subGrid.addRecord(<any>{ name: "width", value: originalTexture.getSize().width });
                subGrid.addRecord(<any>{ name: "height", value: originalTexture.getSize().height });
                subGrid.addRecord(<any>{ name: "name", value: originalTexture.name });
                
                if (originalTexture instanceof Texture) {
                    subGrid.addRecord(<any>{ name: "url", value: originalTexture.url });
                }
                
                return subGrid;
            };

            // Finish
            this._core.editor.editPanel.onClose = () => {
                this._texturesList.destroy();

                this._scene.dispose();
                this._engine.dispose();
                
                this._core.removeEventReceiver(this);
            };
        }
        
        // Configures a render target to be rendered
        private _configureRenderTarget(): void {
            var width = this._currentRenderTarget.getSize().width;
            var height = this._currentRenderTarget.getSize().height;
            var imgData = new ImageData(width, height);
            
            this._currentOnAfterRender = this._currentRenderTarget.onAfterRender;
            this._dynamicTexture = new DynamicTexture("RenderTargetTexture", { width: width, height: height }, this._scene, false);
            
            this._currentRenderTarget.onAfterRender = (faceIndex: number) => {
                
                if (this._currentOnAfterRender)
                    this._currentOnAfterRender(faceIndex);
                
                this._currentPixels = this._core.engine.readPixels(0, 0, width, height);
                
                for (var i = 0; i < this._currentPixels.length; i++)
                    imgData.data[i] = this._currentPixels[i];

                this._dynamicTexture.getContext().putImageData(imgData, 0, 0);
                this._dynamicTexture.update(false);
            };
            
            this._targetTexture = this._dynamicTexture;
        }
        
        // Restores the render target
        private _restorRenderTarget(): void {
            this._currentRenderTarget.onAfterRender = this._currentOnAfterRender;
            
            this._dynamicTexture.dispose();
            this._dynamicTexture = null;
            this._currentPixels = null;
            this._currentRenderTarget = null;
        }
        
        // Fills the texture list
        private _fillTextureList(): void {
            this._texturesList.clear();
            
            for (var i = 0; i < this._core.currentScene.textures.length; i++) {
                var texture = this._core.currentScene.textures[i];
                
                var row: ITextureRow = {
                    name: texture.name || (<any>texture).url,
                    width: texture.getBaseSize() ? texture.getBaseSize().width : 0,
                    height: texture.getBaseSize() ? texture.getBaseSize().height : 0,
                    recid: i
                };
                
                if (texture.isCube) {
                    row.w2ui = { style: "background-color: #FBFEC0" };
                }
                else if (texture.isRenderTarget) {
                    row.w2ui = { style: "background-color: #C2F5B4" };
                }
                
                this._texturesList.addRecord(row);
            }
            
            this._texturesList.refresh();
        }

        private _addTextureToList(texture: BaseTexture): void {
            this._texturesList.addRow({
                name: texture.name,
                width: texture.getBaseSize() ? texture.getBaseSize().width : 0,
                height: texture.getBaseSize() ? texture.getBaseSize().height : 0,
                recid: this._texturesList.getRowCount() - 1
            });

            this._core.editor.editionTool.updateEditionTool();
        }

        // On readed texture file callback
        private _onReadFileCallback(name: string): (data: string | ArrayBuffer) => void {
            return (data: string | ArrayBuffer) => {
                var texture: BaseTexture = null;

                if (name.indexOf(".hdr") !== -1) {
                    var hdrData = new Blob([data], { type: 'application/octet-stream' });
                    var hdrUrl = window.URL.createObjectURL(hdrData);

                    try {
                        texture = new BABYLON.HDRCubeTexture(hdrUrl, this._core.currentScene);
                        texture.name = name;
                        BABYLON.FilesInput.FilesToLoad[name.toLocaleLowerCase()] = Tools.CreateFile(new Uint8Array(<ArrayBuffer>data), name);
                    }
                    catch (e) {
                        GUI.GUIWindow.CreateAlert("Cannot load HDR texture...", "HDR Texture Error");
                    }
                }
                else if (name.indexOf(".dds") !== -1) {
                    try {
                        BABYLON.FilesInput.FilesToLoad[name.toLocaleLowerCase()] = Tools.CreateFile(new Uint8Array(<ArrayBuffer>data), name);
                        texture = BABYLON.CubeTexture.CreateFromPrefilteredData("file:" + name, this._core.currentScene);
                        texture.name = name;
                        texture.gammaSpace = false;
                    }
                    catch (e) {
                        GUI.GUIWindow.CreateAlert("Cannot load DDS texture...", "DDS Texture Error");
                    }
                }
                else {
                    texture = Texture.CreateFromBase64String(<string>data, name, this._core.currentScene, false, false, Texture.BILINEAR_SAMPLINGMODE);
                    texture.name = (<any>texture).url = texture.name.replace("data:", "");
                }

                this._addTextureToList(texture);
            };
        }
    }
}