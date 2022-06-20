const EMPTY = 0;
const MY_SHIP = 1;
const MY_SHIP_HIT = 2;
const MY_SHIP_DESTROYED = 3;

const MY_SHOT_MISSED = 1;
const MY_SHOT_HIT = 2;
const MY_SHOT_DESTROYED = 3;

const PLAYER_0 = 0;
const PLAYER_1 = 1;
const DIRECTION_H = 0;
const DIRECTION_V = 1; // jak robic enumy w JS

class SquareArray2D {
    constructor(n) {
        this.n = n;
        this.array = new Array(n * n);
        this.array.fill(EMPTY);
    }

    get(row, col) {
        return this.array[row * this.n + col];
    }

    set(row, col, value) {
        return this.array[row * this.n + col] = value;
    }

    clear() {
        this.array.fill(EMPTY);
    }
}

class ShipPlayerState {
    constructor() {
        this.shipSizesArray = new Array(4);
        this.shipSizesArray.fill(EMPTY);
        this.ships = new SquareArray2D(10);
        this.hits = new SquareArray2D(10);
        this.hitsCounter = 0;
    }
}

class Rules {
    constructor() {
        this.shipSizesArray = new Array(4);
        this.shipSizesArray[0] = 4;
        this.shipSizesArray[1] = 3;
        this.shipSizesArray[2] = 2;
        this.shipSizesArray[3] = 1;

    }
}

const STATE_PRE_GAME = -1
const STATE_ADDING_SHIPS = 0; // dodawanie statkow - na razie mozna jeszcze dodawac obok siebie, co jest bledem chyba
//nie mamy tez opcji zatopiony - mozna by to sprawdzac badajac pola obok statku (8 pol + specjalne przypadki)
//albo statki roznych rozmiarow oznaczac inaczej - i tez to jakos sprawdzac

//dodaj zwyciestwo

const STATE_PLAYER_0_TURN = 1;
const STATE_PLAYER_1_TURN = 2;
const STATE_PLAYER_0_VICTORY = 3;
const STATE_PLAYER_1_VICTORY = 4;
const STATE_BROKEN = 5;


const MOVE_RESULT_INVALID = -1;
const MOVE_RESULT_MISS = 0;
const MOVE_RESULT_HIT = 1;
const MOVE_RESULT_VICTORY = 2;



class ShipGame {
    constructor(rules) {
        if (rules == undefined)
            rules = new Rules();
        this.players = [null, null];
        this.rules = rules;
        this.state = [new ShipPlayerState(), new ShipPlayerState()];
        this.currentState = STATE_PRE_GAME;
        this.n = 10;
    }

    getCurrentState() {
        return this.currentState;
    }

    getCurrentPlayer() {
        if (this.currentState == STATE_PLAYER_0_TURN) {
            return 0;
        }
        if (this.currentState == STATE_PLAYER_1_TURN) {
            return 1;
        }
        return -1;
    }

    playerReady(player) {
        for (let i = 0; i < 4; i++) {
            if (this.state[player].shipSizesArray[i] != this.rules.shipSizesArray[i])
                return false;
        }
        return true;
    }

    getPlayerIdx(name) {
        if (this.players[0] == name)
            return 0;
        else if (this.players[1] == name)
            return 1;
        return null;
    }

    playerLeave(player) {
        const idx = this.getPlayerIdx(player);
        this.players[idx] = null;
    }

    joinGame(player, sit) {
        if (sit !== 0 && sit !== 1)
            return false;
        if (this.players.includes(player))
            return false;
        if (this.players[sit] !== null)
            return false;

        this.players[sit] = player;

        if (this.players[0] !== null && this.players[1] !== null)
            this.currentState = STATE_ADDING_SHIPS;
        //this.showTurnInfo()

        return true;
    }

    clearShips(playerName) {
        if (this.currentState != STATE_ADDING_SHIPS) {
            return false;
        }
        console.log("ships board cleared: " + playerName);
        const player = this.getPlayerIdx(playerName);

        this.state[player].ships.clear();

        for (let i = 0; i < 4; i++) {
            this.state[player].shipSizesArray[i] = 0;
        }
        return true;
    }


    addShip(playerName, size, row, col, direction) {
        //zakladam ze statek liczymy od gory lub od lewej        
        if (this.currentState != STATE_ADDING_SHIPS)
            return false;
        console.log("adding ship " + playerName + " " + size + " " + row + " " + col + " " + direction);
        const player = this.getPlayerIdx(playerName);
        if (direction == DIRECTION_H) {
            if (col + size - 1 >= 10) {
                return false;
            }
        }
        if (direction == DIRECTION_V) {
            if (row + size - 1 >= 10) {
                return false;
            }
        }
        if (direction == DIRECTION_H) {
            for (let i = col; i < col + size; i++) {
                if (this.state[player].ships.get(row, i) != 0) {
                    console.log("Blad, statki sie przecinaja")
                    return false;
                }
            }
        }
        if (direction == DIRECTION_V) {
            for (let i = row; i < row + size; i++) {
                if (this.state[player].ships.get(i, col) != 0) {
                    console.log("Blad, statki sie przecinaja")
                    return false;
                }
            }
        }
        if (this.state[player].shipSizesArray[size - 1] == 5 - size) {
            //5-size to tyle ile ma byc statkow danego rodzaju - choc dziala tylko dla domyslnych zasad
            console.log("Blad, za duzo masz juz tych statkow")
            return false;
        }
        //Sprawdzanie sasiednich pol - nie wiem czy zadziala na brzegach
        if (direction == DIRECTION_H) {
            if (col != 0) {
                if (this.state[player].ships.get(row, col - 1) != 0) {
                    console.log("Blad, inny statek w otoczeniu")
                    return false;

                }
            }
            if (col != 10 - size) {
                if (this.state[player].ships.get(row, col + size) != 0) {
                    console.log("Blad, inny statek w otoczeniu")
                    return false;

                }
            }
            for (let i = col - 1; i <= col + size; i++) {
                if (row != 0 && i >= 0 && i <= 9) {
                    if (this.state[player].ships.get(row - 1, i) != 0) {
                        console.log("Blad, inny statek w otoczeniu")
                        return false;
                    }
                }
                if (row != 9 && i >= 0 && i <= 9) {
                    if (this.state[player].ships.get(row + 1, i) != 0) {
                        console.log("Blad, inny statek w otoczeniu")
                        return false;
                    }
                }
            }

        }

        if (direction == DIRECTION_V) {
            if (row != 0) {
                if (this.state[player].ships.get(row - 1, col) != 0) {
                    console.log("Blad, inny statek w otoczeniu")
                    return false;

                }
            }
            if (row != 10 - size) {
                if (this.state[player].ships.get(row + size, col) != 0) {
                    console.log("Blad, inny statek w otoczeniu")
                    return false;
                }

            }
            for (let i = row - 1; i <= row + size; i++) {
                if (col != 0 && i >= 0 && i <= 9) {
                    if (this.state[player].ships.get(i, col - 1) != 0) {
                        console.log("Blad, inny statek w otoczeniu")
                        return false;
                    }
                }
                if (col != 9 && i >= 0 && i <= 9) {
                    if (this.state[player].ships.get(i, col + 1) != 0) {
                        console.log("Blad, inny statek w otoczeniu")
                        return false;
                    }
                }

            }

        }

        //dodawanie

        this.state[player].shipSizesArray[size - 1]++;
        if (direction == DIRECTION_H) {
            for (let i = col; i < col + size; i++) {
                this.state[player].ships.set(row, i, 1);
            }
        }

        if (direction == DIRECTION_V) {
            for (let i = row; i < row + size; i++) {
                this.state[player].ships.set(i, col, 1);
            }
        }
        //this.showTurnInfo()
        return true;
    }

    startGame() {
        for (let i = 0; i < 4; i++) {
            if (this.state[0].shipSizesArray[i] != this.rules.shipSizesArray[i] ||
                this.state[1].shipSizesArray[i] != this.rules.shipSizesArray[i]) {
                return false;
            }

        }
        this.currentState = STATE_PLAYER_0_TURN;
        //this.showTurnInfo();
        return true;
    }

    shoot(player, row, col) {
        if (this.state[player].hits.get(row, col) != 0) {
            return false;
        }

        const opponent = (player + 1) % 2;
        if (this.state[opponent].ships.get(row, col) == MY_SHIP) {
            this.state[opponent].ships.set(row, col, MY_SHIP_HIT);
            this.state[player].hits.set(row, col, MY_SHOT_HIT);
        }

        return true;
    }


    checkDestroy(player, row, col) {
        if (this.state[player].ships.get(row, col)  == MY_SHIP_DESTROYED)
            return true;

        if (this.state[player].ships.get(row, col) != MY_SHIP_HIT) {
            return false;
        }

        for (let x = -1;; x--) {
            if (col + x < 0 || this.state[player].ships.get(row, col + x) == EMPTY)
                break;
            else if (this.state[player].ships.get(row, col + x) == MY_SHIP)
                return false;
        }

        for (let x = 1;; x++) {
            if (col + x > 9 || this.state[player].ships.get(row, col + x) == EMPTY)
                break;
            else if (this.state[player].ships.get(row, col + x) == MY_SHIP)
                return false;
        }

        for (let y = -1;; y--) {
            if (row + y < 0 || this.state[player].ships.get(row + y, col) == EMPTY)
                break;
            else if (this.state[player].ships.get(row + y, col) == MY_SHIP)
                return false;
        }

        for (let y = 1;; y++) {
            if (row + y > 9 || this.state[player].ships.get(row + y, col) == EMPTY)
                break;
            else if (this.state[player].ships.get(row + y, col) == MY_SHIP)
                return false;
        }
//Niszczenie statkow

        this.state[player].ships.set(row, col, MY_SHIP_DESTROYED);
        this.state[1 - player].hits.set(row, col, MY_SHOT_DESTROYED);


        for (let x = -1;; x--) {
            if (col + x < 0 || this.state[player].ships.get(row, col + x) != MY_SHIP_HIT)
                break;
            this.state[player].ships.set(row, col + x, MY_SHIP_DESTROYED);
            this.state[1 - player].hits.set(row, col + x, MY_SHOT_DESTROYED);
        }

        for (let x = 1;; x++) {
            if (col + x > 9 || this.state[player].ships.get(row, col + x) != MY_SHIP_HIT)
                break;
            this.state[player].ships.set(row, col + x, MY_SHIP_DESTROYED);
            this.state[1 - player].hits.set(row, col + x, MY_SHOT_DESTROYED);
        }

        for (let y = -1;; y--) {
            if (row + y < 0 || this.state[player].ships.get(row + y, col) != MY_SHIP_HIT)
                break;
            this.state[player].ships.set(row + y, col, MY_SHIP_DESTROYED);
            this.state[1 - player].hits.set(row + y, col, MY_SHOT_DESTROYED);
        }

        for (let y = 1;; y++) {
            if (row + y > 9 || this.state[player].ships.get(row + y, col) != MY_SHIP_HIT)
                break;
            this.state[player].ships.set(row + y, col, MY_SHIP_DESTROYED);
            this.state[1 - player].hits.set(row + y, col, MY_SHOT_DESTROYED);
        }

        return true;
    }

    playerMove(player, row, col) {
        if (player != this.getCurrentPlayer()) {
            return false;
        }
        if (row >= 10 || col >= 10) { //niepoprawny wybor
            return false;
        }

        if (this.state[player].hits.get(row, col) != EMPTY) { //niepoprawny wybor
            return false;
        }

        else {
            if (this.state[1 - player].ships.get(row, col) == EMPTY) { // pudlo
                this.state[player].hits.set(row, col, MY_SHOT_MISSED);
                this.currentState = (this.currentState == STATE_PLAYER_1_TURN ? STATE_PLAYER_0_TURN : STATE_PLAYER_1_TURN);
                //this.showTurnInfo()
            }
            else {
                this.state[player].hits.set(row, col, MY_SHOT_HIT); // trafiony
                this.state[1 - player].ships.set(row, col, MY_SHIP_HIT);
                this.state[player].hitsCounter++;
                //this.showTurnInfo()
                if (this.state[player].hitsCounter == 20) {
                    this.currentState = (this.currentState == STATE_PLAYER_1_TURN ? STATE_PLAYER_1_VICTORY : STATE_PLAYER_0_VICTORY)
                }
            }
        }
        return true;


        // spradzic czyja tura
        // sprawdzić zakres
        // upade stanu
    }
}

exports.ShipGame = ShipGame;
exports.STATE_PRE_GAME = STATE_PRE_GAME;
exports.STATE_PLAYER_0_TURN = STATE_PLAYER_0_TURN;
exports.STATE_PLAYER_1_TURN = STATE_PLAYER_1_TURN;
exports.STATE_PLAYER_0_VICTORY = STATE_PLAYER_0_VICTORY;
exports.STATE_PLAYER_1_VICTORY = STATE_PLAYER_1_VICTORY;
exports.STATE_ADDING_SHIPS = STATE_ADDING_SHIPS;
exports.STATE_BROKEN = STATE_BROKEN;
