import io from 'socket.io';
import printer from './printer';

class Server{
        
        async start(port, printerConf){
            await this.stop();
            this._socket = io();

            // Test handshake
            this._socket.use((socket, next) => {
                const host = socket.handshake.headers.host;
                // console.log(handshake);
                const result = /^127\.|192\.168\.|10\./i.test(host);
                if(result){
                    console.log(`access: ${host}`);
                    next();
                }
                else{
                    next(new Error(`Authentication error ${host}`));
                }
            });

            this._socket.on('connection', (client) => {
                this.execute(client);
            });

            this._socket.listen(port);
            
            printer.init(printerConf);
        }
        
        async stop(){
            if(this._socket){
                await new Promise((resolve, reject)=>{
                    this._socket.close((err)=>{
                        if(!err)resolve();
                        else reject(err);
                    });
                });
                this._socket = undefined;
            }
        }
        
        execute(socket){
            socket.on('print_message', (order, fn)=>{
                this
                    .printMessage(order)
                    .then(()=>{
                        fn();
                        setTimeout(()=>{
                            socket.disconnect(true);
                        });
                    })
                    .catch((err)=>{
                        fn(err);
                        setTimeout(()=>{
                            socket.disconnect(true);
                        });
                    });
            });
        }
        
        async printMessage(order){
            try{
                if(!await printer.connected()){
                    throw 'Não connectado';
                }
                await printer.start(order);
            }
            catch(err){
                console.log(err);
                throw err;
            }
        }
}

export default new Server();