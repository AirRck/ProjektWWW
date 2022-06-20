var express = require('express');
var session = require('express-session');
var ws = require('ws');
const { User } = require("./user");
const {ShipGame, STATE_PLAYER_0_TURN, STATE_PLAYER_0_VICTORY, STATE_PLAYER_1_TURN, STATE_PLAYER_1_VICTORY, STATE_PRE_GAME, STATE_ADDING_SHIPS, STATE_BROKEN} = require("./game");
const cookieParser = require('cookie-parser');
const { login, register } = require('./database');

var app = express();

class WSManager {
    constructor() {
        this.socketMap = new Map();
    }

}

const wsServer = new ws.Server({ noServer: true });
const wsManager = new WSManager();

wsServer.on('connection', socket => {    
    //console.log(wsServer.clients);
    socket.on('message', message => {        
        const login = message.toString();
        socket.login = login;
        console.log("registering ws for " + login);
        wsManager.socketMap.set(login, socket);
    });
});

wsServer.on("close", socket => {
    console.log("closing");
    console.log(socket.login);
})

const PORT = process.env.PORT || 9080;

//var parser = bodyParser.urlencoded();
//var parser = bodyParser.json();

// app.use(parser);
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
 app.use(session({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:false,
    cookie: { maxAge: 60*60*24*1000 },
    resave: false
}));

class GameManager {
    constructor() {
        this.currentId = 0;
        this.games = new Map();
        this.playerToGameMap = new Map();
    }

    createGame() {
        this.games.set(this.currentId, new ShipGame());        
        this.currentId++;
        return this.currentId - 1;
    }

    addPlayerToGame(gameId, player, sit) {
        const game = this.getGame(gameId);        
        if (game == null)
            return null;
        if (game.currentState != STATE_PRE_GAME)
            return false;
        // sprawdzic czy uzytwownik jest juz w jakiejs grze 
        if (this.getGameForPlayer(player) == null) {
            if (game.joinGame(player, sit)) {
                this.playerToGameMap.set(player, gameId);        
                return true;            
            }   
        }     
        return false;
    }

    removePlayerFromGame(gameId, player) {
        const game = this.getGame(gameId);        
        game.playerLeave(player);
        if (game.getCurrentState() != STATE_PLAYER_0_VICTORY && game.getCurrentState() != STATE_PLAYER_1_VICTORY) {
            game.currentState = STATE_BROKEN;
        }

        this.playerToGameMap.delete(player);

        const socket = wsManager.socketMap.get(player);

        if (socket != null) {
            socket.close();
        }

        wsManager.socketMap.delete(player);

        if (game.players[0] == null && game.players[1] == null) {
            this.games.delete(gameId);
        }
    }


    /**
     * 
     * @param {string} id 
     * @returns {ShipGame}
     */
    getGame(id) {
        return this.games.get(id);
    }

    getGameForPlayer(playerName) {
        return this.playerToGameMap.get(playerName);
    }

    getGames() {
        const games = [];
        this.games.forEach((game, id) => {
            games.push({
                id: id,
                sits: game.players
            })
        })

        return games;
    }
}

const gameManager = new GameManager();
// mapa => id gry -> gra

// app.get('/users', function(req, res) {
//     users.getUsers((err, data) => {
//         console.log("data: ", data);
//         res.end(JSON.stringify(data));
//     });
// })

 app.post('/login', function(req, res) {
    const userId = req.body.name
    const passwd = req.body.pass;
    console.log(req.body);
    res.setHeader("Content-Type", 'application/json; charset=utf-8');
    login(userId, passwd, (user) => {
        if (user == null) {
            res.end(`{"login": "false"}`);
        } else {
            req.session.user = user;
            res.end(`{"login": "true"}`);    
        }
    });        
})


app.post('/logout', function(req, res) {
    res.setHeader("Content-Type", 'application/json; charset=utf-8');
    const me = getMe(req);
    if (me != null) {
        const player = me.id;        
        const socket = wsManager.socketMap.get(player);

        if (socket != null) {
            socket.close();
        }

        wsManager.socketMap.delete(player);

    }
        req.session.destroy();
        res.end(`{"status": "ok"}`);
});

app.post('/register', function(req, res) {
    const userId = req.body.id;
    const userName = req.body.name;
    const passwd = req.body.pass;
    //  baza.getUser(id, () =)
    console.log(req.body + " asd ");
    res.setHeader("Content-Type", 'application/json; charset=utf-8');
    register(userId, userName, passwd, (ok) =>{
        if (ok == null) {
            res.end(`{"login": "false"}`);
        } else {
            res.end(`{"login": "true"}`);    
        }

    });
})

/**
 * 
 * @param {Request} req 
 * @returns {User}
 */
function getMe(req) {
    const se = req.session;
    if (se.user) {
        return se.user;
    }
    return null;
}

app.get('/profile', function(req, res) {        
    // console.log(req.body);
    // users.addUser(req.query.last_name, req.query.first_name);
    // res.end("User added");
    res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8'
    });

    const se = req.session;
    if (se.user) {
        /**@type User */
        const user = se.user;
        const game = gameManager.getGameForPlayer(user.id);

        res.end(`{
            "userId": "${user.id}", 
            "name": "${user.name}",
            "game": ${game == null ? -1 : game}
        }`);
    } else {
        res.end(`{
            "error": "not logged in" 
        }`);
    }
       
    //res.end();
})


app.post('/newgame', function(req, res) {        
    res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8'
    });

        let gameId = gameManager.createGame();
        res.end(`{"result": "${gameId}"}`);
       
})

function notifyPlayer(playerName) {
    const opWs = wsManager.socketMap.get(playerName);
    if (opWs == null)
        return;

    console.log("notifying " + playerName);
    opWs.send("update");
}

function notifyOpponent(myName, gameId) {
    console.log("trying to notify from " + myName + " " + gameId);    
    const game = gameManager.getGame(gameId);
    // console.log(game);
    if (game == null)
        return;

    // console.log(game);

    const myIdx = game.getPlayerIdx(myName);
    if (myIdx == -1)
        return;
    
    const opponentId = 1 - myIdx;
    const opponentName = game.players[opponentId];

    if (opponentName == null)
        return;
    
    console.log("opName " + opponentName);

    const opWs = wsManager.socketMap.get(opponentName);
    if (opWs == null)
        return;

    console.log("notifying " + opponentName);
    opWs.send("update");
}


app.post('/join/:gameId/:sit', function(req, res) {        
    res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8'
    });

    const me = getMe(req);
    if (me == null) {    
        res.end(`{"result": "error"}`);
        return;
    } else {
        const gameId = parseInt(req.params["gameId"]);
        let addRes = gameManager.addPlayerToGame(parseInt(gameId), me.id, parseInt(req.params["sit"]));
        notifyOpponent(me.id, gameId);
        res.end(`{"result": "${addRes}"}`);
    }
       
    //res.end();
})

app.get('/games', (req, res) => { 
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(gameManager.getGames()));
});

app.get('/gameState', (req, res) => { 
    // musimy wyslac do klienta stan gry czyli 2 plansze, nasze statki i ich stan i plansze ztrafieniami
    const me = getMe(req);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (me == null) {
        res.end(`{"result": "error"}`);
        return;
    }   

    const gameId = gameManager.getGameForPlayer(me.id);    

    if (gameId == undefined ) {
        res.end(`{"result": "error", "cause": "user not in game"}`);
    } else {
        const game = gameManager.getGame(gameId);
        const playerIdx = game.players[0] == me.id ? 0 : 1;        
        // console.log(game);
        const myState = {
            gameState: game.getCurrentState(),                        
            you: game.getPlayerIdx(me.id),
            players: game.players,
            playersReady: [game.playerReady(0), game.playerReady(1)],
            playerState: game.state[playerIdx]
        }
        res.end(JSON.stringify(myState));
    }
});

app.post(`/game/clearShips`, (req, res) => {
    const me = getMe(req);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (me == null) {
        res.end(`{"result": "error"}`);
    }   

    const gameId = gameManager.getGameForPlayer(me.id);    

    if (gameId == undefined ) {
        res.end(`{"result": "error", "cause": "user not in game"}`);
        return;
    } else {
        const game = gameManager.getGame(gameId);        
        if (game.getCurrentState() != STATE_ADDING_SHIPS) {
            res.end(`{"result": "error", "cause": "invalid game state"}`);
            return;
        }

        game.clearShips(me.id);
        notifyOpponent(me.id, gameId);
        res.end(`{"result": "ok"}`);
    }
});

app.post(`/game/resign`, (req, res) => {
    const me = getMe(req);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (me == null) {
        res.end(`{"result": "error"}`);
    }   

    const gameId = gameManager.getGameForPlayer(me.id);    


    if (gameId == undefined ) {
        res.end(`{"result": "error", "cause": "user not in game"}`);
        return;
    } else {
        const game = gameManager.getGame(gameId);
        const opponent = game.players[0] == me.id ? game.players[1] : game.players[0];
        gameManager.removePlayerFromGame(gameId, me.id);
        notifyPlayer(opponent);
        res.end(`{"result": "ok"}`);
    }
});

app.post('/game/addShip/:row/:col/:size/:h', (req, res) => {
    const me = getMe(req);
    console.log(me);
    console.log(req.params);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (me == null) {
        res.end(`{"result": "error"}`);
    }   

    const gameId = gameManager.getGameForPlayer(me.id);    

    if (gameId == undefined ) {
        res.end(`{"result": "error", "cause": "user not in game"}`);
    } else {
        const game = gameManager.getGame(gameId);
        const col = parseInt(req.params["col"]);
        const row = parseInt(req.params["row"]);
        const size = parseInt(req.params["size"]);
        const h = (req.params["h"] == "true");        
        let shipAdded = game.addShip(me.id, size, row, col, h == true ? 0 : 1);
        if (shipAdded == true) {
            game.startGame();
            notifyOpponent(me.id, gameId);
            res.end(`{"result": "ok"}`);
        } else {
            res.end(`{"result": "error"}`);
        }
        ///console.log(res);        

    }
    
    
});

app.post('/game/shoot/:row/:col', (req, res) => {
    const me = getMe(req);    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (me == null) {
        res.end(`{"result": "error"}`);
        return;
    }   

    const gameId = gameManager.getGameForPlayer(me.id);    

    if (gameId == undefined ) {
        res.end(`{"result": "error", "cause": "user not in game"}`);
    } else {
        const game = gameManager.getGame(gameId);
        const col = parseInt(req.params["col"]);
        const row = parseInt(req.params["row"]);

        const myIdx = game.getPlayerIdx(me.id);
        if (myIdx != game.getCurrentPlayer()) {
            res.end(`{"result": "error", "cause": "not your turn"}`);
            return;
        }

        if (game.playerMove(myIdx, row, col)) {
            game.checkDestroy(1 - myIdx, row, col);
            notifyOpponent(me.id, gameId);
            res.end(`{"result": "ok"}`);
        } else {
            res.end(`{"result": "error", "cause": "wrong shoot"}`);
        }        
        ///console.log(res);        

    }
    
});

const listener = app.listen(PORT);

listener.on('upgrade', (request, socket, head) => {    
        wsServer.handleUpgrade(request, socket, head, socket => {          
          wsServer.emit('connection', socket, request);
        });
    });

