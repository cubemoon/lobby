var chess = {};

function $(id) {
  return document.getElementById(id);
}

chess.Role = {
  PLAYER_WHITE: 0,
  PLAYER_BLACK: 1,
  PLAYER_UNASSIGNED: 2,
  OBSERVER: 3
};

chess.nickname = 'Anonymous';

chess.offerDraw = function () {
  // TODO: Implement me.  Requires agreement of other player.
}

chess.resign = function() {
    // TODO: Implement me.
  }

chess.undo = function(){
  // TODO: Implement me. Requires agreement of other player.
}

chess.newGame = function() {
  Overlay.show('chess-lobby');
}

chess.createGame = function(lobbyUrl, listenPort, description) {
  var url = 'ws://' + lobbyUrl + '/';
  var host = new lobby.Host(url, parseInt(listenPort));
  window.server = new chess.GameServer(host, description);
  host.addEventListener('ready', function(address) {
    window.client = new chess.GameClient(new lobby.Client(address), 
                                         chess.Role.PLAYER_UNASSIGNED);
  });
}

chess.GameServer = function(connection, name) {
  this.clients_ = [];
  this.connection_ = connection;
  this.connection_.updateInfo({
    gameId: 'chess',
    name: 'chess',
    description: name,
    observable: false, // TODO: Fix to allow spectators.
    status: 'awaiting_players',
  });
  this.connection_.addEventListener('message', this.onMessageReceived.bind(this));
  this.connection_.addEventListener('disconnection', this.onDisconnection.bind(this));
};

chess.GameServer.prototype = {
  onMessageReceived: function(clientIndex, message) {
    var echo = !!message.echo;
    if (message.alias) {
      console.log('player[' + clientIndex + '] = ' + message.alias + 
         ', role = ' + message.role);
      this.clients_[clientIndex] = message;
      this.updatePlayers();
    } else {
      // Rebroadcast all messages to all clients.
      for (var i in this.connection_.clients) {
        if (echo || i != clientIndex)
          this.connection_.send(i, message);
      }
    }
  },

  onDisconnection: function(clientIndex) {
    delete this.clients_[clientIndex];
    this.updatePlayers();
  },

  updatePlayers: function() {
    var aliases = [];
    for (var i in this.clients_)
      aliases.push(this.clients_[i].alias);
    this.connection_.updateInfo({
      players: aliases
    });

    var playerCount = 0;
    var assignedPlayers = 0;

    // See if we have enough players to start the game.
    for (var i in this.clients_) {
      var role = this.clients_[i].role;
      if (role != chess.Role.OBSERVER) {
        playerCount++;
        if (role != chess.Role.PLAYER_UNASSIGNED)
          assignedPlayers++;
      }
    }
    if (playerCount > 1 && assignedPlayers < 2) {
      // Randomly assign roles using first two available players.
      var r = Math.floor(2*Math.random());
      var assigned = [undefined, undefined];
      for (var i in this.clients_) {
        if (this.clients_[i].role != chess.Role.OBSERVER) {
          this.clients_[i].role = r;
          assigned[r] = i;
          r = 1 - r;
          if (assigned[r] != undefined)
            break;
        }
      }
      // Remaining players become observers.
      for (var i in this.clients_) {
        if (this.clients_[i].role == chess.PLAYER_UNASSIGNED)
          this.clients_[i].role = chess.OBSERVER;
      }
      if (assigned[0] != undefined && assigned[1] != undefined) {
        // Dismiss waiting dialog.
        Dialog.dismiss('info');
        // Inform all players of the roles.
        var message = {
          players: {
            white: this.clients_[assigned[0]].alias,
            black: this.clients_[assigned[1]].alias
          }
        };
        for (var i in this.connection_.clients) {
          message.role = this.clients_[i].role;
          this.connection_.send(i, message);
        }
      }
    }
    // TODO: Observers joining late should get the move list.
  }
};

chess.GameClient = function(connection, role) {
  this.connection_ = connection;
  this.name_ = chess.nickname;
  this.role_ = role;
  this.connection_.addEventListener('connected', this.onConnected.bind(this));
  this.connection_.addEventListener('disconnected', this.onDisconnected.bind(this));
  this.connection_.addEventListener('message', this.onMessageReceived.bind(this));
};

chess.GameClient.prototype = {

  onConnected: function() {
    this.connection_.send({alias: this.name_, role: this.role_});
  },

  onMessageReceived: function(message) {
    if (message.moveFrom) {
      chess.chessboard.move(
          message.moveFrom, 
          message.moveTo, 
          /* trial */ false, 
          /* message response */ true);
    } else if (message.players) {
       chess.chessboard.reset();
       chess.scoresheet.reset();
       var view = message.role == chess.Role.PLAYER_BLACK ?
         ChessBoard.View.WHITE_AT_TOP : ChessBoard.View.BLACK_AT_TOP;
       console.log('view = ' + view);
       chess.chessboard.setView(view);
    } else {
      for (key in message) {
         console.log(key + ': ' + message[key]);
      }
    }
  },

  /**
   * Sends a message to all clients.
   */
  sendMessage: function(message) {
    message.sender = this.id_;
    this.connection_.send(message);
  },

  onDisconnected: function() {
  }
};

window.addEventListener('DOMContentLoaded', function() {
  chess.chessboard = new ChessBoard();
  $('board-area').appendChild(chess.chessboard);
  chess.chessboard.reset();
  chess.scoresheet = new Scoresheet();
  $('move-list').appendChild(chess.scoresheet);

/*
  Teporarily disabling until implemented.
  $('chess-button-offer-draw').addEventListener('click', chess.offerDraw);
  $('chess-button-resign').addEventListener('click', chess.resign);
  $('chess-button-undo').addEventListener('click', chess.undo);
*/
  $('chess-button-new-game').addEventListener('click', chess.newGame);

}, false);


