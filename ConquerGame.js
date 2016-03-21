'use strict'
/**
 * Created by acastillo on 3/20/16.
 */


class ConquerGame{

    constructor(parameters){
        this.gameID = Math.round(Math.random()*1e12);
        if(parameters)
            this.defParameters = parameters;
        else{
            this.defParameters = {productionRate: 20};

        }
    }

    /**
     * This function inits a game. It set a random map and then place each player
     * at a random place in the map. All the players has only one planet at the beginning
     * with the same productionRate
     */
    initGame(mapSize, nResources, clients){
        this.clients = clients;
        this.nPlayers = clients.length;
        this.shipments = [];
        this.turn = 0;
        this.movements = 0;
        this.map = new Map(mapSize, mapSize, nResources-clients.length);
        //console.log(this.map);

        for(let i=0;i<clients.length;i++){
            let created = false;
            while(!created){
                let x = Math.round(Math.random()*mapSize);
                let y = Math.round(Math.random()*mapSize);
                if(x>=0&&x<mapSize&&y>=0&&y<mapSize){
                    if(this.map.getPosition(x,y)===null){
                        this.map.addPlanet(clients[i].name, x, y, clients[i].name, this.defParameters.productionRate, 0);
                        created = true;
                    }
                }
            }
        }
        this.status = "started";
        var d = new Date();
        this.startTime = d.getTime();
        this.gameLogs = [];
    }

    updateGame(){
        this.map.update();
        this.processArrivals();
        var winner = this.checWinner();
        if(winner){
            this.finish(winner);
        }
        else{
            this.turn++;
        }
    }

    finish(winner){
        this.status = "finished";
        this.winner = winner;
        var d = new Date();
        this.endTime = d.getTime()
    }

    processArrivals(){
        this.turnLogs = [];
        //Check the shipments list and update the map
        for(let i=this.shipments.length-1;i>=0;i--){
            if(this.shipments[i].arrivalTurn==this.turn){
                let log = this.shipments[i].destinyPlanet.processIncoming(this.shipments[i], this);
                this.turnLogs.push(log);
                this.gameLogs.push(log);
                this.shipments.splice(i,1);
            }
        }
    }

    setMovements(turnMovements){
        let playersInThisTurn = {};
        for(let i=0;i<turnMovements.length;i++){
            playersInThisTurn[turnMovements[i].owner]=true;
        }
        let nPlayers = Object.keys(playersInThisTurn);
        if(nPlayers.length==this.clients.length){
            for(let i=0;i<turnMovements.length;i++){
                let fromPlanet = this.map.getPosition(turnMovements[i].from.x,turnMovements[i].from.y);
                let toPlanet = this.map.getPosition(turnMovements[i].to.x,turnMovements[i].to.y);

                if(fromPlanet&&toPlanet&&fromPlanet.owner==turnMovements[i].owner) {
                    this.movements++;
                    fromPlanet.consumeResources(turnMovements[i].size);
                    this.shipments.push(new Shipment(
                        fromPlanet,
                        toPlanet,
                        turnMovements[i].size,
                        this.turn,
                        turnMovements[i].owner
                    ));
                }
            }
            //Delete the processed movements
            turnMovements.splice(0,turnMovements.length);

        }
        else{
            throw new  (function(message) {
                this.message = message;
                this.name = "UserException";
            })("Some players has not end their turn");
        }
    }

    getPlanetsByPlayer(){
        let list = [];
        for(let i=0;i<this.clients.length;i++){
            list[i]={client:this.clients[i], planets:this.map.getPlanets(this.clients[i].name)};
        }
        return list;
    }

    checWinner(){
        //First check if the whole map is owned by a single player
        let tmp = this.map.getNPlanetsByPlayer();
        let activeOwners = Object.keys(tmp);
        let shipOwners = {};
        if(activeOwners.length==1){
            for(let i=this.shipments.length-1;i>=0;i--){
                if(!shipOwners[this.shipments.owner]){
                    shipOwners[this.shipments.owner]=1;
                }
                else{
                    shipOwners[this.shipments.owner]++;
                }
            }
            let activeShippers = Object.keys(shipOwners);
            if(activeShippers.length==0||
                (activeShippers.length==1&&activeOwners[0]==activeShippers[0])){
                //Only one owner and no more shipments
                return activeOwners[0];
            }
        }
        return false;
    }
};

class Shipment{

    constructor(fromPlanet, toPlanet, size, turn, owner){
        this.fromPlanet = fromPlanet;
        this.toPlanet = toPlanet;
        this.size = size;
        this.turn = turn;
        this.owner = owner;
        this.processed = false;
        this.arrivalTurn = turn+fromPlanet.distanceTo(toPlanet);
    }

};

class Map{
    /**
     * This function build a new random map, with the specified size and nResources
     */
    constructor(rows, cols, nResources){
        this.rows = rows;
        this.cols = cols;
        this.size = rows*cols;
        this.grid = new Array(rows);
        this.elements = new Array();
        let left = this.size;
        for(let i=0;i<rows;i++){
            this.grid[i]=new Array(cols);
            for(let j=0;j<cols;j++){
                if(nResources>0) {
                    let rnd = Math.random();
                    let prob = nResources / left;
                    if (rnd <= prob) {
                        var productionRate = Math.round(Math.random() * 15 + 10);
                        this.grid[i][j] = new Planet("p_"+nResources, i, j, null, productionRate, 0);
                        this.elements.push(this.grid[i][j]);
                        nResources--;
                        if(nResources==0)
                            return;
                    }
                    else {
                        this.grid[i][j] = null;
                    }
                    left--;
                }
            }
        }
    }

    getPosition(x,y){
        return this.grid[x][y];
    }

    addPlanet(name, x, y, owner, productionRate, initResources){
        this.grid[x][y]=new Planet(name, x,y,owner,productionRate, initResources);
        this.elements.push(this.grid[x][y]);
    }

    update(){
        for(let i=0;i<this.elements.length;i++){
            this.elements[i].updateResources();
        }
    }

    getNPlanetsByPlayer(){
        var list = {};
        for(let i=0;i<this.elements.length;i++){
            if(!list[this.elements[i].getOwner()]){
                list[this.elements[i].getOwner()]=1;
            }
            else{
                list[this.elements[i].getOwner()]++;
            }
        }
        return list;
    }

    getPlanets(player){
        var list = [];
        for(let i=0;i<this.elements.length;i++){
            if(this.elements[i].getOwner()==player){
                list.push(this.elements[i]);
            }
        }
        return list;
    }

    getMapView(player){
        var list = [];
        for(let i=0;i<this.elements.length;i++){
            let planet = {name:this.elements[i].name,
                            x:this.elements[i].x,
                            y:this.elements[i].y,
                            owner:this.elements[i].owner
                        };
            //If the planet has been conquered, then show the production rate
            if(this.elements[i].owner){
                planet.productionRate = this.elements[i].productionRate;
            }
            //Show the ammount of resources if the player own the planet
            if(this.elements[i].owner==player){
                planet.resources = this.elements[i].resources;
            }
            list.push(planet);
        }
        return list;
    }
};

class Planet{
    constructor(name, x, y, owner, productionRate, initResources){
        this.name = name;
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.productionRate = productionRate;
        this.resources = initResources;
        this.visits = [];
    }

    setOwner(owner){
       this.owner = owner;
    }

    getOwner(){
        return this.owner;
    }

    updateResources(){
        this.resources+=this.productionRate;
    }

    processIncoming(pack, game){
        var eventLog = {source:pack.owner, turn:game.turn};
        if(pack.owner == this.owner){
            this.resources+=pack.size;
            eventLog.status = "reinforced";
        }
        else{
            this.resources-=pack.size;
            eventLog.status = "attacked";
            if(this.resources<0){
                eventLog.status = "conquered";
                eventLog.previousOwner = this.owner;
                this.resources*=-1;
                setOwner(pack.owner);

            }
        }
        recordVisit(pack, game.turn);
        pack.processed = true;
        return eventLog;
    }

    consumeResources(shipmentSize){
        this.resources-=shipmentSize;
    }

    distanceTo(planetB){
        return Math.abs(this.x-planetB.x) + Math.abs(this.y-planetB.y);
    }

    getInfo(player){
        if(player == this.owner){
            return {productionRate,resources};
        }
        else{
            if(hasBeenVisitor(player))
                return {productionRate};
            else
                return {};
        }
    }

    hasBeenVisitor(player){
        if(this.visits[player]){
            return true;
        }
        else{
            return false;
        }
    }
    //Perhaps I have to record the whole pack!
    recordVisit(shipment, turn){
        var player = shipment.owner;
        if(!hasBeenVisitor(player)){
            this.visits[player]=[{turn:turn, size:shipment.size, owner:this.getOwner()}];
        }
        else{
            this.visits[player].push({turn:turn, size:shipment.size, owner:this.getOwner()});
        }
    }
};

module.exports = ConquerGame;
