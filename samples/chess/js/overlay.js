

Overlay = (function() {

  var registry_ = {};

  var activeOverlay_ = null;

  function Overlay(name) {
    this.initialize(name);
  }

  function getElement(name) {
    return $(name + '-overlay');
  }

  Overlay.prototype = {

     name: null,

     initialize: function(name) {
       this.name = name;
     },

     show: function() {
       Overlay.show(this.name);
     },

     close: function() {
       Overlay.dismiss(this.name);
     },
  }

  /**
   * Displays an overlay.
   * @param {string} name Registered name of the overlay.
   */
  Overlay.show = function(name) {
    activeOverlay_ = registry_[name];
    var element = getElement(name);
    // TODO: fade transition.
    element.hidden = false;
    element.parentNode.hidden = false;
  }

  Overlay.dismiss = function(name) {
    var element = getElement(name);
    // TODO: fade transition.
    element.hidden = true;
    element.parentNode.hidden = true;
  }

  Overlay.register = function(name, dialog) {
    registry_[name] = dialog;
  }

  Overlay.getInstance = function(name) {
    return registry_[name];
  }

  return Overlay;

})();

/**
 * The chess lobby shows a list of games and provides the option for creating
 * a new game.
 */
function ChessLobbyOverlay() {
  Overlay.apply(this, ['chess-lobby']);
}

ChessLobbyOverlay.prototype = {
  __proto__: Overlay.prototype,

  initialize: function(name) {
    Overlay.prototype.initialize.call(this, name);

    var gameLobby = $('chess-lobby');
    lobby.GameLobby.setGameId('chess');
    lobby.GameLobby.decorate(gameLobby);

    gameLobby.setFilter({name: 'chess'});

    var lobbyUrl = gameLobby.getUrl();
    var index = lobbyUrl.indexOf('://');
    if (index > 0) {
      lobbyUrl = lobbyUrl.substring(index + 3);
    }
    $('chess-lobby-url').value = lobbyUrl;
    $('host-new-chess-game').addEventListener('click', this.onNewGame.bind(this));
    $('refresh-game-list').addEventListener('click', this.onRefresh.bind(this));
    $('chess-game-list-close').addEventListener('click', this.close.bind(this));

    var self = this;
    gameLobby.onSelectGame = function(game) {
      $('join-game-nickname').value = chess.nickname;
      Dialog.showJoinGameDialog(game);
    };
  },

  onNewGame: function(event) {
    $('nickname').value = chess.nickname;
    Dialog.show('game-details');
  },

  onRefresh: function(event) {
    $('chess-lobby').refresh();
  },

  show: function() {
    $('host-new-chess-game').disabled = !!window.server;
    Overlay.show(this.name);
  }

};

window.addEventListener('load', function() {
  Overlay.register('chess-lobby', new ChessLobbyOverlay());
}, false);
