var printer = require("node-thermal-printer");
var SerialPort = require('serialport');

/**
 * Remove acentos de caracteres
 * @param  {String} stringComAcento [string que contem os acentos]
 * @return {String}                 [string sem acentos]
 */
function removerAcentos(stringComAcento) {
    var string = stringComAcento;
    var mapaAcentosHex = {
        a: /[\xE0-\xE6]/g,
        A: /[\xC0-\xC6]/g,
        e: /[\xE8-\xEB]/g,
        E: /[\xC8-\xCB]/g,
        i: /[\xEC-\xEF]/g,
        I: /[\xCC-\xCF]/g,
        o: /[\xF2-\xF6]/g,
        O: /[\xD2-\xD6]/g,
        u: /[\xF9-\xFC]/g,
        U: /[\xD9-\xDC]/g,
        c: /\xE7/g,
        C: /\xC7/g,
        n: /\xF1/g,
        N: /\xD1/g
    };

    for (var letra in mapaAcentosHex) {
        var expressaoRegular = mapaAcentosHex[letra];
        string = string.replace(expressaoRegular, letra);
    }

    return string;
}

// Formato de data - dd/mm/yyyy hh:mm:ss
function formatDate(date) {
    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return day + '/' + monthIndex + '/' + year + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

exports.init = function (conf) {
    exports.config = Object.assign(
        {
            type: printer.printerTypes.EPSON, // 'star' or 'epson'
            interface: '/dev/usb/lp1', // Linux interface
            characterSet: 'UTF-8', // Printer character set
            removeSpecialCharacters: false, // Removes special characters - default: false
            replaceSpecialCharacters: true // Replaces special characters listed in config files - default: true
        },
        conf
    );

    printer.init(exports.config);

    exports.port = new SerialPort(
        exports.config.interface, 
        {
            baudRate: 57600
        },
        function (err) {
            if (err) {
                exports.isConnectedError = err;
                console.log(err);
            }
        }
    );
};


exports.connected = function () {
    return new Promise((resolve, reject) => {
        resolve(!exports.isConnectedError);
        // printer.isPrinterConnected(response => {
        //     resolve(response);
        // });
    });
};

exports.start = function (order) {

    printer.alignLeft();
    printer.setTextNormal();
    printer.println("Restaurante: " + removerAcentos(order.orders.restaurant.name));
    printer.println("Pedido: " + order.id + "  Data: " + formatDate(new Date()));
    printer.println(" ");


    printer.println(" ");
    printer.println("Cliente: " + removerAcentos(order.orders.user.first_name) + ' ' + removerAcentos(order.orders.user.last_name));
    printer.println("Telefone: " + order.orders.user.phone);
    printer.println(" ");

    if (order.flag_delivery) {
        printer.println("Endereco: " + removerAcentos(order.orders.address.street.replace("•", ",")));
        if (order.orders.address.complement) {
            printer.println("Comp: " + removerAcentos(order.orders.address.complement));
        }
        printer.println("Bairro: " + removerAcentos(order.orders.address.neighborhood));
        printer.println("Cidade: " + removerAcentos(order.orders.address.city));
        printer.println("CEP: " + order.orders.address.cep);
    } else {
        printer.println('Vai buscar');
    }

    printer.println(" ");

    printer.alignLeft();
    printer.setTextNormal();
    printer.tableCustom([// Prints table with custom settings (text, align, width, bold)
        {
            text: "Produtos",
            align: "LEFT",
            width: 0.5
        }, {
            text: "Quantidade",
            align: "CENTER",
            width: 0.25,
            bold: true
        }, {
            text: "Valor",
            align: "RIGHT",
            width: 0.25
        }
    ]);


    for (const item of order.orders.items) {

        // Se  o item conter algum obrigatorio então não mostrar o preo do item.
        var itemPrice = '';
        console.log(item.required && item.required.price);
        
        if (item.options.required && item.options.required.name) {
            itemPrice = "-";
        } 
        else {
            itemPrice = "R$ " + parseFloat(item.price).toFixed(2);
        }

        printer.tableCustom([// Prints table with custom settings (text, align, width, bold)
            {
                text: removerAcentos(item.name),
                align: "LEFT",
                width: 0.5
            }, {
                text: item.quantity,
                align: "CENTER",
                width: 0.25,
                bold: true
            }, {
                text: itemPrice,
                align: "RIGHT",
                width: 0.25
            }
        ]);

        if (item.options.required && item.options.required.name) {
            printer.println("      Obrigatorio");
            printer.println("          " + removerAcentos(item.options.required.name) + " - R$ " + item.options.required.price.toFixed(2));
        }
        
        if (item.options.optional && item.options.optional.length) {
            printer.println("      Adicionais");
            
            for (const optional of item.options.optional) {
                var additional = removerAcentos(optional.name) + " - R$ " + optional.price.toFixed(2);
                printer.println("          " + additional);
            }
            
        }

        printer.alignRight();
        printer.println("Total: R$" + item.total.toFixed(2));

        printer.alignLeft();
        printer.setTextNormal();

        printer.println(" ");
    }

    printer.alignRight();

    printer.println("Sub-Total: R$ " + order.sub_total.toFixed(2));
    if (order.flag_delivery) {
        printer.println("Taxa de entrega: R$ " + order.frete.toFixed(2));
        printer.println("------------------------");

        var total = parseFloat(order.total) + parseFloat(order.frete);
        printer.println("Total: R$ " + total.toFixed(2));
    } 
    else {
        printer.println("------------------------");
        printer.println("Total: R$ " + order.total.toFixed(2));
    }

    printer.println(" ");

    printer.alignLeft();
    printer.setTextNormal();
    printer.println("Forma de pagamento: ");
    if (order.orders.payment.name === 'Dinheiro') {
        printer.println(order.orders.payment.name + ' Troco: ' + order.orders.money);
    } 
    else {
        printer.println(order.orders.payment.card + ' (MAQUINA)');
    }


    printer.cut();

    return new Promise((resolve, reject) => {
        port.write(printer.getBuffer(), function(err) {
            if (err) {
                console.log('Error on write: ', err.message);
                reject(err);
            }
            else{
                console.log('message written');
                resolve();
            }
        });

        // printer.execute(function (err) {
        //     if (err) {
        //         reject(`Print failed ${err}`);
        //     } else {
        //         resolve("Print done");
        //     }
        // });
    });

};