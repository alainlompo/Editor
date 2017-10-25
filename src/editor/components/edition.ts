import { IEditionTool } from '../edition-tools/edition-tool';
import SceneTool from '../edition-tools/scene-tool';
import NodeTool from '../edition-tools/node-tool';

import Editor from '../editor';

export default class EditorEditionTools {
  // Public members
  public tools: IEditionTool<any>[] = [];
  public root: string = 'EDITION';

  public panel: W2UI.W2Panel;

  /**
   * Constructor
   * @param editor: the editor's reference
   */
  constructor (protected core: Editor) {
    // Get panel
    this.panel = core.layout.getPanelFromType('left');

    // Add tools
    this.addTool(new SceneTool());
    this.addTool(new NodeTool());
  }

  public resize (width: number): void {
    this.tools.forEach(t =>  {
      if (t.tool && t.tool.element)
        t.tool.element.width = width;
    });
  }

  /**
   * Add the given tool (IEditionTool)
   * @param tool the tool to add
   */
  public addTool (tool: IEditionTool<any>): void {
    let current = this.root;

    // Create container
    $('#' + current).append('<div id="' + tool.divId + '"></div>');
    $('#' + tool.divId).hide();

    // Add tab
    this.panel.tabs.add({
      id: tool.tabName,
      caption: tool.tabName,
      closable: false,
      onClick: (event) => this.changeTab(event.target)
    });

    // Add & configure tool
    tool.core = this.core;
    this.tools.push(tool);
  }

  /**
   * Sets the object to edit
   * @param object the object to edit
   */
  public setObject(object: any): void {
    let firstTool: IEditionTool<any> = null;

    this.tools.forEach(t => {
      if (t.isSupported(object)) {
        // Show
        $('#' + t.divId).show();

        this.panel.tabs.show(t.tabName);
        t.update(object);

        if (!firstTool)
          firstTool = t;
      } else {
        // Hide
        $('#' + t.divId).hide();
        this.panel.tabs.hide(t.tabName);
      }
    });

    if (firstTool)
      this.changeTab(firstTool.tabName);
  }

  /**
   * When a tab changed
   * @param target the target tab Id
   */
  protected changeTab (target: string): void {
    this.tools.forEach(t => {
      const container = $('#' + t.divId);

      if (t.tabName === target)
        container.show();
      else
        container.hide();
    });
  }
}