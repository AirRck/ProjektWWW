let gamePhase = -1;
let isLogged = false;
let myTurn = false;
let ws;

function show(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hide(id) {
  document.getElementById(id).classList.add("hidden");
}

class SquareArray2D {
  constructor(n) {
      this.n = n;
      this.array = new Array(n * n);
      this.array.fill(0);
  }

  get(row, col) {
      return this.array[row * this.n + col];
  }

  set(row, col, value) {
      return this.array[row * this.n + col] = value;
  }
}

/**
 * 
 * @param {HTMLElement} tableElement 
 */
function tableToShipsArray(tableElement) {
  const arr = new SquareArray2D(10);
  tableElement.querySelectorAll("td").forEach(td => {
    if (td.classList.contains("selected")) {
      let pos = td.getAttribute("data-pos").split(",");
      arr.set(parseInt(pos[0]), parseInt(pos[1]), 1);
    }
  })
  return arr;
}

function createStateGrid(element) {
  const table = document.createElement("table");
  for (let row = 0; row < 10; row++) {
    const tr = document.createElement("tr");
    for (let col = 0; col < 10; col++) {
      const td = document.createElement("td");
      td.setAttribute("data-pos", `${row},${col}`);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  element.appendChild(table);
}

function updateGameStatus() {
  const infoField = document.getElementById("infoField");
  fetch("/gameState")
  .then(rs => rs.json())
  .then(state => {
    if (JSON.stringify(state).includes("error")) {     
      if (isLogged) 
        show("lobby");
      hide("game");
      return;
    } 
    
    hide("lobby");
    show("game");

    
    if (state.gameState == 5) {
      infoField.innerText = "Gra przerwana";
      show("resign");
    } else if (state.gameState == -1) {
      infoField.innerText = "Oczekiwanie na dołączenie przeciwnika"
    } else if (state.gameState == 0) {      
      let waiting = [];
      if (!state.playersReady[0])
        waiting.push(state.players[0]);
      if (!state.playersReady[1])
        waiting.push(state.players[1]);

      infoField.innerText = `Dodawanie statków: Oczekiwanie na: ${waiting.join(", ")}`;
    } else if (state.gameState == 1 || state.gameState == 2) {      
      infoField.innerText = "Tura gracza: " + state.players[state.gameState - 1];
    } else if(state.gameState == 3 || state.gameState == 4){
      infoField.innerText = "Koniec gry! Zwyciężył  " + state.players[state.gameState - 3]

    }
    

    //document.querySelectorAll("#myShips td").forEach(td => td.classList.remove("selected"));
    /**@type {Array} */
    const shipArray = state.playerState.ships.array;
    const hitsArray = state.playerState.hits.array;
    document.querySelectorAll("#myShips td").forEach(td => {
      td.classList.remove("ship");
      td.classList.remove("hit");
    });

    shipArray.forEach((v, i) => {
      const row = Math.floor(i / 10);
      const col = Math.floor(i % 10);
      if (v == 1) {        
        document.querySelector(`#myShips td[data-pos="${row},${col}"`).classList.add("ship");
      } else if (v == 2) {        
        document.querySelector(`#myShips td[data-pos="${row},${col}"`).classList.add("hit");
      } else if (v == 3) {        
        document.querySelector(`#myShips td[data-pos="${row},${col}"`).classList.add("destroyed");
      }
    });

    document.querySelectorAll("#myShots td").forEach(td => {
      td.classList.remove("hit");
      td.classList.remove("miss");
    });

    hitsArray.forEach((v, i) => {
      const row = Math.floor(i / 10);      
      const col = Math.floor(i % 10);

      if (v == 1) {        
        document.querySelector(`#myShots td[data-pos="${row},${col}"`).classList.add("miss");
      } else if (v == 2) {        
        document.querySelector(`#myShots td[data-pos="${row},${col}"`).classList.add("hit");
      } else if (v == 3) {        
        document.querySelector(`#myShots td[data-pos="${row},${col}"`).classList.add("destroyed");
      }
    });

    const phase = state.gameState;
    gamePhase = phase;
    if (phase == 0) {

      document.getElementById("myShips").classList.add("edit");
      document.getElementById("addShip").classList.remove("hidden");
      document.getElementById("clearShips").classList.remove("hidden");

    } else {
      document.getElementById("myShips").classList.remove("edit");
      document.getElementById("addShip").classList.add("hidden");
      document.getElementById("clearShips").classList.add("hidden");
    }

    if (state.you == (phase - 1)) {
      document.getElementById("myShots").classList.add("edit");
      myTurn = true;
      
      
      //Wyswietl ze twoja tura
    } else {
      document.getElementById("myShots").classList.remove("edit");
      myTurn = false;
      //Wyswietl ze przeciwnika tura
    }
    
  });
}

function getGames() {
    fetch("/games")
    .then(rs => rs.json())
    .then(games => {
        let gamesDiv = document.getElementById("games");
        gamesDiv.innerHTML = "";
        for (let game of games) {
            const sits = game.sits;
            const gameDiv = $(`<div class="game">
            <div class="gameId">${game.id}</div>
            <div class="sits">
              <div data-game-id="${game.id}" data-sit="0" class="sit ${sits[0] == null ? "free" : ""}">${sits[0] == null ? "DOŁĄCZ" : sits[0]}</div>
              <div data-game-id="${game.id}" data-sit="1" class="sit ${sits[1] == null ? "free" : ""}">${sits[1] == null ? "DOŁĄCZ" : sits[1]}</div>
            </div>
            <div>`)[0];
            gamesDiv.appendChild(gameDiv);
        }
        document.querySelectorAll(".sit.free").forEach(sitDiv => {
          sitDiv.addEventListener("click", () => {        
            const game = sitDiv.getAttribute("data-game-id");
            const sit = sitDiv.getAttribute("data-sit");
            
            fetch("/join/" + game + "/" + sit,  {
              method: 'POST', // or 'PUT'    
            }).then(r => r.json()).then(() => {
              getGames();
              updateGameStatus();
            });          
            
          });
        });
    }).finally(() => updateGameStatus());    
}
function getLogin() {
    fetch("/profile")
    .then(rs => rs.json())
    .then(o => {
        let loginDiv = document.getElementById("userName");
        if (o.hasOwnProperty("error")) {
            document.getElementById("menuUser").classList.add("hidden");
            document.getElementById("menuLogin").classList.remove("hidden");
            document.getElementById("menuRegister").classList.remove("hidden");
        } else {
            document.getElementById("menuUser").classList.remove("hidden");
            document.getElementById("menuLogin").classList.add("hidden");
            document.getElementById("menuRegister").classList.add("hidden");

            loginDiv.innerText = o.name;
            isLogged = true;            
            ws = new WebSocket("ws://" + location.host);
            ws.onopen = () => ws.send(o.userId);
            ws.onmessage = me => {                            
                console.log("updating");
                updateGameStatus();
            }
        }
    });    
}

// var acc = document.getElementsByClassName("accordion");
// var i;

// for (i = 0; i < acc.length; i++) {
//   acc[i].addEventListener("click", function() {
//     /* Toggle between adding and removing the "active" class,
//     to highlight the button that controls the panel */
//     this.classList.toggle("active");

//     /* Toggle between hiding and showing the active panel */
//     var panel = this.nextElementSibling;
//     if (panel.style.display === "block") {
//       panel.style.display = "none";
//     } else {
//       panel.style.display = "block";
//     }
//   });
// }

getLogin();
getGames()

document.getElementById("addGame").addEventListener("click", () => {
  fetch("/newgame",  {
    method: 'POST', // or 'PUT'    
  }).then(r => r.json()).then(() => {
    getGames();  
  });
});


document.getElementById("register").addEventListener("click", () => {
  const name = document.getElementById("registerName").value;
  const pass = document.getElementById("registerPass").value;
  const id = document.getElementById("registerId").value;
  fetch("/register",  {
    method: 'POST', // or 'PUT'    
    body: JSON.stringify({
      id: id,
      name: name,
      pass: pass
    }),
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    }
  }).then(r => r.json()).then(() => {
    window.location.reload(); 
  });

})


document.getElementById("loginButton").addEventListener("click", () => {
  const name = document.getElementById("loginName").value;
  const pass = document.getElementById("loginPass").value;
  fetch("/login",  {
    method: 'POST', // or 'PUT'    
    body: JSON.stringify({
      name: name,
      pass: pass
    }),
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    }
  }).then(r => r.json()).then(() => {
    window.location.reload(); 
  });

})

createStateGrid(document.getElementById("myShips"));
createStateGrid(document.getElementById("myShots"));
updateGameStatus();

document.getElementById("myShips").querySelectorAll("td").forEach(td => {
  td.addEventListener("mousedown", () => {
  
    if (gamePhase == 0) {
      td.classList.toggle("selected");
    }
  });
  
});

document.getElementById("myShots").querySelectorAll("td").forEach(td => {
  td.addEventListener("mousedown", () => {
    if (myTurn) {
      const pos = td.getAttribute("data-pos").split(",");
      fetch(`/game/shoot/${pos[0]}/${pos[1]}`, {
        method: "POST"
      })
      .then(r => r.json())
      .then(json => {        
        updateGameStatus();
      });
    }
  });
});

document.getElementById("clearShips").addEventListener("click", () => {
  fetch(`/game/clearShips`, {
    method: "POST"
  })
  .then(r => r.json())
  .then(() => updateGameStatus());
});
  
document.getElementById("resign").addEventListener("click", () => {
  fetch(`/game/resign`, {
    method: "POST"
  })
  .then(r => r.json())
  .then(() => getGames(() => updateGameStatus()));
});



document.getElementById("addShip").addEventListener("click", () => {
  
  const ships = tableToShipsArray(document.querySelector("#myShips table"));
  document.querySelectorAll("#myShips td").forEach(td => td.classList.remove("selected"));

  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++) {      
      if (ships.get(y, x) != 1)
        continue;

      let minY = 1000;
      let minX = 1000;
      let maxY = -1;
      let maxX = -1;

      const stack = [];
      stack.push([x, y]);
      ships.set(y, x, 2);

      const validate = pos => {
        return pos[0] >= 0 && pos[0] < 10 &&
        pos[1] >= 0 && pos[1] < 10;
      }
      
      while (stack.length > 0) {
        const currentPos = stack.pop();
        //console.log(currentPos);
        minY = Math.min(minY, currentPos[1]);
        maxY = Math.max(maxY, currentPos[1]);
        minX = Math.min(minX, currentPos[0]);
        maxX = Math.max(maxX, currentPos[0]);       

        let dirs = [[currentPos[0] - 1, currentPos[1]], [currentPos[0] + 1, currentPos[1]], [currentPos[0], currentPos[1] - 1], [currentPos[0], currentPos[1] + 1]];

        dirs.forEach(dir => {
          if (validate(dir) && ships.get(dir[1], dir[0]) == 1) {
            ships.set(dir[1], dir[0], 2);
            stack.push(dir);
          }
        });
      }

      if(!(minY == maxY || minX == maxX))
        continue
      else {
        if (minY == maxY) {
          const row = minY;
          const col = minX;
          const len = maxX - minX + 1;
          fetch(`/game/addShip/${row}/${col}/${len}/true`, {
            method: "POST"
          })
          .then(r => r.json())
          .then(() => updateGameStatus());
        } else {
          const row = minY;
          const col = minX;
          const len = maxY - minY + 1;
          fetch(`/game/addShip/${row}/${col}/${len}/false`, {
            method: "POST"
          })
          .then(r => r.json())
          .then(() => updateGameStatus());
        }
      }          
    }
});

document.querySelectorAll(".panel").forEach(el => el.classList.add("hidden"));

document.getElementById("menuLogin").addEventListener("click", ev => {
  document.querySelectorAll(".panel").forEach(el => el.classList.add("hidden"));
  document.getElementById("panelLogin").classList.remove("hidden");
  hide("lobby");
});

document.getElementById("menuRegister").addEventListener("click", ev => {
  document.querySelectorAll(".panel").forEach(el => el.classList.add("hidden"));
  document.getElementById("panelRegister").classList.remove("hidden");
  hide("lobby");
});

document.getElementById("menuLogout").addEventListener("click", () => {
  fetch("/logout", {
    method: "POST"
  })
    .then(rs => rs.json())
    .then(o => {
      isLogged = false;
    }).finally(() => location.reload());  
});

// window.setInterval(() => {
//   updateGameStatus();
// }, 500);

//getState();



