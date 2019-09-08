const electron = require('electron');
const menubar = require('menubar');
const path = require('path');
const url = require('url');

const menu = require('./lib/menu');

// Numbers (remember to match in CSS!):
// video: 315 by 560
// arrow height: 10
// frame: 3

const mb = menubar({
  width: 315 + 3 * 2,
  height: 560 + 10 + 3 * 2,
  icon: `${__dirname}/${process.platform == 'win32' ? 'fika.ico' : 'iconTemplate.png'}`,
  alwaysOnTop: true,
  preloadWindow: true,
  transparent: true,
  webPreferences: {experimentalFeatures: true},
});

const context = new menu.Manager([
  {label: `${electron.app.getName()} v${electron.app.getVersion()}`, enabled: false},
  {type: 'separator'},
  {id: 'autoplay', label: 'Autoplay', type: 'checkbox', checked: true, click: menuItem => {
    mb.window.webContents.send('status', 'autoplay', menuItem.checked);
  }},
  {type: 'separator'},
  {id: 'logOut', label: 'Log Out', click: () => { mb.window.webContents.send('control', 'logOut'); }, enabled: false},
  {role: 'quit', click: () => { electron.app.quit(); }},
]);

mb.on('after-create-window', () => {
  mb.tray.on('right-click', () => {
    mb.tray.popUpContextMenu(context.menu);
  });

  mb.window.on('hide', () => {
    mb.window.webContents.send('status', 'visible', false);
  });

  mb.window.on('show', () => {
    mb.window.webContents.send('status', 'visible', true);
  });
});

electron.ipcMain.on('control', (event, action) => {
  switch (action) {
  case 'disableAutoplay':
    context.update('autoplay', {checked: false});
    break;
  case 'enableAutoplay':
    context.update('autoplay', {checked: true});
    break;
  case 'hide':
    mb.hideWindow();
    break;
  case 'show':
    mb.showWindow();
    break;
  }
});

electron.ipcMain.on('status', (event, status, value) => {
  switch (status) {
  case 'sessionAccount':
    context.update('logOut', {
      enabled: !!value,
      label: value ? `Log Out ${value.display_name}` : 'Log Out',
    });
    break;
  }
});
