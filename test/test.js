'use strict';
/**
 * Created by acastillo on 3/21/16.
 */
var ConquerGame = require("../ConquerGame");

describe('Test Conquer', function () {
    var params = {productionRate: 21};
    var mapSize = 20;
    var nResources = 20;
    var clients = [{name:"A",
        socket: function(message){console.log(this.name+" sent: "+JSON.stringify(message))}},
        {name:"B",
            socket: function(message){console.log(this.name+" sent: "+JSON.stringify(message))}}];

    var game = new ConquerGame(params);
    game.initGame(mapSize, nResources, clients);
    game.updateGame();
    var goodMovements = [];
    var badMovements = [];
    var list;

    it('Check generated elements', function () {
        game.map.elements.length.should.eql(nResources);
    });

    it('Check initial planets by player', function () {
        list = game.getPlanetsByPlayer();
        list.length.should.eql(clients.length);

        for(var i=0;i<list.length;i++) {
            list[i].planets[0].resources.should.eql(params.productionRate);
            list[i].client.name.should.eql(list[i].planets[0].owner);
        }
    });

    it('Check socket pre-movements', function () {
        for(var i=0;i<list.length;i++){
            list[i].client.socket(list[i].planets);
            goodMovements.push({owner: list[i].client.name,
                size: list[i].planets[0].resources,
                from:{x: list[i].planets[0].x,
                    y: list[i].planets[0].y},
                to:{x:game.map.elements[i].x,
                    y:game.map.elements[i].y}
            });

            badMovements.push({owner: list[0].client.name,
                size: list[i].planets[0].resources,
                from:{x: list[i].planets[0].x,
                    y: list[i].planets[0].y},
                to:{x:game.map.elements[i].x,
                    y:game.map.elements[i].y}
            });
        }
        try{
            game.setMovements(badMovements);
        }
        catch(e){
            e.should.be.type('object');
        }
        badMovements.length.should.eql(list.length);
        game.shipments.length.should.eql(0);

        try{
            game.setMovements(goodMovements);
        }
        catch(e){
            e.should.be.null;
        }
        goodMovements.length.should.eql(0);
        game.shipments.length.should.eql(list.length);
    });

    it('Check socket post-movements', function () {
        game.updateGame();
        game.shipments.length.should.eql(clients.length);
        list = game.getPlanetsByPlayer();
        list.length.should.eql(clients.length);
        for(var i=0;i<list.length;i++){
            list[i].planets[0].resources.should.eql(params.productionRate);
        }
    });
});



