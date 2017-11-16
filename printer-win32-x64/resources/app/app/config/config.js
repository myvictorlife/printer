const {ipcRenderer} = require('electron');


window.onload = () => {

    const app = new Vue({
        el: '#app',

        data:{
            printerModify: false,
            printer:{type:'', interface:''}
        },

        computed: {
            printer_type: {
                set: function (type) {
                    this.printer.type = type;
                    this.printerModify = true;
                },
                get: function () {
                    return this.printer.type;
                }
            },
            printer_interface: {
                set: function (interface) {
                    this.printer.interface = interface;
                    this.printerModify = true;
                },
                get: function () {
                    return this.printer.interface;
                }
            }
        },

        methods:{

            /**
             * Button exit event
             */
            exit: function (event) {
                ipcRenderer.send('exit',{});
            },

            /**
             * Dutton save event
             */
            save: function (event) {
                ipcRenderer.send(
                    'save',
                    {
                        port: this.port, 
                        printer: this.printer
                    }
                );
                window.close();
            }
        },

        /**
         * Init config data
         */
        created: function(){
            const data = ipcRenderer.sendSync('init', 'ping');
            this.port = data.port;
            this.printer = data.printer;
            this.isInit = data.isInit;
        }
    });

};

