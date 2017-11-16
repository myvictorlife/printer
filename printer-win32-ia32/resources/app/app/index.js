import server from './server';
import printer from './printer';
import {app, Menu, Tray, BrowserWindow, ipcMain} from 'electron';
import path from 'path';
import Config from 'electron-config';

class App{
    
    /**
     * Init application
     * @returns {App}
     */
    constructor(){
        // start tray
        let tray = null;
        app.on('ready', () => {
          tray = new Tray(path.join(__dirname, 'icons/ic_local_printshop_black_24dp_1x.png'));
          tray.setToolTip('This is termal printer driver.');
          tray.on('click', ()=>{
            this.showConfig();
          });
        });
        app.on('window-all-closed', ()=>{});
        if(app.dock)app.dock.hide();
        if(app.hide)app.hide();

        // init config
        this.config = new Config();

        // в настройки
        this._port = this.config.get('server_port',3478);
        this._printer = {
            type: this.config.get('printer_type', 'epson') , // 'star' or 'epson'
            interface: this.config.get('printer_interface', '/dev/usb/lp1') // Adds additional special characters to those listed in the config files
        };

        // init events
        ipcMain.on('exit', (event, arg) => {
            console.log('close');
            app.exit();
        });

        ipcMain.on('save', async (event, arg) => {
            console.log(arg);
            this._port = arg.port;
            this._printer = arg.printer;

            this.config.set('server_port', this._port);
            this.config.set('printer_type', this._printer.type);
            this.config.set('printer_interface', this._printer.interface);
            
            await server.stop();
            await this.serverStart();
        });

        ipcMain.on('init', async (event, arg) => {
            console.log('init');
            event.returnValue = {
                port: this._port,
                printer: this._printer,
                isInit: await printer.connected()
            };
        });
    }
    
    main(){
        this.serverStart();
    }
    
    async serverStart(){
        try{
            await server.start(this._port, this._printer);
            console.log(`start server ok`);
        }
        catch(err){
            console.log(err);
        }
    }

    showConfig() {
        const mainWindow = new BrowserWindow({
            width: 400,
            height: 370,
            //fullscreen:true,
            resizable: false,
            center: true,
            resizable: false,
            closable: true,
            minimizable: false,
            maximizable: false,
            skipTaskbar: true,
            show: false,
            title: 'print service',
            icon: path.join(__dirname, 'icons/ic_local_printshop_black_24dp_1x.png')
        });
        mainWindow.setMenuBarVisibility(false);
        mainWindow.loadURL('file://' + __dirname + '/config/index.html');
        mainWindow.show();
    }
}

export default App;