const electron = require('electron');

const updateables = new Set(['checked', 'enabled']);

exports.Manager = class Manager {
  constructor(template) {
    // TODO: Support submenus.
    this.menu = null;
    this.template = template.map(item => {
      const copy = Object.assign({}, item);
      Object.defineProperty(copy, '__original', {value: item});
      if (!copy.id) copy.id = `mi${Math.round(Math.random() * 9999999999)}`;
      copy.click = (menuItem, browserWindow, event) => {
        this._handleClick(copy, menuItem, browserWindow, event);
      };
      return copy;
    });
    this.rebuild();
  }

  _handleClick(templateItem, menuItem, browserWindow, event) {
    if (templateItem.__original.click) templateItem.__original.click(menuItem, browserWindow, event);
    if (templateItem.type === 'checkbox') {
      templateItem.checked = menuItem.checked;
    } else if (templateItem.type === 'radio') {
      // TODO: Update checked state of adjacent radio items.
    }
  }

  rebuild() {
    if (this.menu) this.menu.destroy();
    this.menu = electron.Menu.buildFromTemplate(this.template);
    // Create a lookup map for all the items with ids.
    this._lookup = new Map();
    for (let [i, item] of this.menu.items.entries()) {
      if (!item.id) continue;
      this._lookup.set(item.id, {item, template: this.template[i]});
    }
  }

  update(itemId, values) {
    const entry = this._lookup.get(itemId);
    Object.assign(entry.template, values);
    if (Object.keys(values).every(k => updateables.has(k))) {
      Object.assign(entry.item, values);
    } else {
      this.rebuild();
    }
  }
};