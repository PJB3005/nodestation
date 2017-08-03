/*
    Node Station - A Space Station 13 clone
    Copyright (C) 2017  Ryan Hanson

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var NodeStation = NodeStation || {};

NodeStation.Play = new Kiwi.State( "Play" );

/**
* The PlayState in the core state that is used in the game. 
*
* It is the state where majority of the functionality occurs 'in-game' occurs.
*/


/**
* This create method is executed when a Kiwi state has finished loading
* any resources that were required to load.
*/

var itemImageMap = {
   questionMark: 0,
   idCard:       1  
};

var mapTileImageMap = {
   questionMark: 0,
   wall:         1,
   floor:        2
};

var consts = {
   tile: {
     width:  32,
     height: 32
   } 
};

function applyCoordToSprite(sprite, coord, offsetX, offsetY) {
   
   offsetX = offsetX || 0;
   offsetY = offsetY || 0;
   sprite.x = coord.x * consts.tile.width + offsetX;
   sprite.y = coord.y * consts.tile.height + offsetY;
}

var socket = undefined;
NodeStation.Play.create = function () {

	Kiwi.State.prototype.create.call( this );
   var self = this;

   this.pawnList = new PawnList();
   this.itemList = new ItemList();
   this.tileList = new TileList();
   this.doorList = new DoorList();


   this.updateTimeSeconds = 0.05;
   this.networkClock = this.game.time.addClock("network");

   this.ownedPawnId = '';
   
   // Creating groups
   this.pawnGroup = new Kiwi.Group(this);
   this.doorGroup = new Kiwi.Group(this);
   this.itemGroup = new Kiwi.Group(this);
   this.uiGroup = new Kiwi.Group(this);
   this.worldGroup = new Kiwi.Group(this);
   
   
   this.addChildAt(this.worldGroup, 0);
   this.addChildAt(this.uiGroup, 1);
   
   this.worldGroup.addChildAt(this.itemGroup, 1); 
   this.worldGroup.addChildAt(this.pawnGroup, 2); 
   this.worldGroup.addChildAt(this.doorGroup, 3); // Over Pawn

	/*
	* Replace with your own game creation code here...
	*/

   
	this.name = new Kiwi.GameObjects.StaticImage(
		this, this.textures.kiwiName, 10, 10) ;

	this.heart = new Kiwi.GameObjects.Sprite(
		this, this.textures.icons, 10, 10 );
	this.heart.cellIndex = 8;
	this.heart.y = this.game.stage.height - this.heart.height - 10;




	this.crown = new Kiwi.GameObjects.Sprite(
		this, this.textures.icons, 10, 10 );
	this.crown.cellIndex = 10;
	this.crown.x = this.game.stage.width - this.crown.width - 10;
	this.crown.y = this.game.stage.height - this.crown.height - 10;


	this.bomb = new Kiwi.GameObjects.Sprite(
		this, this.textures.icons, 0, 10 );
	this.bomb.x = this.game.stage.width - this.bomb.width  -10;


	// Add the GameObjects to the stage
	this.uiGroup.addChild( this.heart );
	this.uiGroup.addChild( this.crown );
	this.uiGroup.addChild( this.bomb );
	this.uiGroup.addChild( this.name );
   

   this.map = new Kiwi.GameObjects.Tilemap.TileMap(this);

   this.map.setTo(consts.tile.width, consts.tile.height, 10, 10);
   
   this.map.createTileType(0);
   this.map.createTileType(1);
   this.map.createTileType(2);
   
   this.mapLayer = this.map.createNewLayer('map', this.textures.mapTiles);
   

   this.mapLayer.setTile(0, 0, 1);
   this.mapLayer.setTile(0, 1, 2);
   this.worldGroup.addChildAt( this.mapLayer, 0);
   this.mapLayer.x = 20;
   this.mapLayer.y = 20;
   this.mapLayer.visible = true;


   
   // Connect to socket.io
   socket = io();
   socket.on('serverInfo', function(msg) {
      self.updateTimeSeconds = msg.updateTimeSeconds;
   });
   socket.on('reconnect', function() {      
      for(var i = 0; i < self.pawnList.list.length; i++) {
         var pawn = self.pawnList.list[i];
         self.pawnGroup.removeChild(pawn.group);
      }
      self.pawnList.reconnect();

      for(var i = 0; i < self.itemList.list.length; i++) {
         var item = self.itemList.list[i];
         self.itemGroup.removeChild(item.sprite);
      }
      
      for(var i = 0; i < self.doorList.list.length; i++) {
         var door = self.doorList.list[i];
         self.doorGroup.removeChild(door.sprite);
      }
      self.doorList.list = [];

      self.itemList.reconnect();
      self.tileList.clear();
   });
   
   
   socket.on('newMap', function(msg) {
      self.worldGroup.removeChild(self.mapLayer);
      self.mapLayer.destroy();
      self.map.setTo(consts.tile.width, consts.tile.height, msg.width, msg.height);
      self.mapLayer = self.map.createNewLayer('map', self.textures.mapTiles);
      self.worldGroup.addChildAt(self.mapLayer, 0);
      self.tileList.resize(msg.width, msg.height);
   });
   socket.on('updateTile', function(msg) {
      var tileImageIndex;

      self.tileList.set(msg.x, msg.y, msg.type, msg.layer);
      var tileIndex = self.tileList.findHighestLayerAtCoord(msg.x, msg.y);

      if(tileIndex < 0) {
         tileImageIndex = 0;
      }
      else {
         var tile = self.tileList.list[tileIndex];
         var mapTileImageLookup = mapTileImageMap[tile.type];
         if(tile.type == '') {
            tileImageIndex = 0;
         }
         else if(mapTileImageLookup) {
            tileImageIndex = mapTileImageLookup + 1;
         }
         else {
            tileImageIndex = 1; // questionMark
         }
      }

      self.mapLayer.setTile(msg.x, msg.y, tileImageIndex);
   });
   socket.on('addPawn', function(msg) {
      var pawnIndex = self.pawnList.findById(msg.id);
      if(pawnIndex < 0) {
         var pawn = self.pawnList.add(msg.id);
         
         
         pawn.sprite = new Kiwi.GameObjects.Sprite(
            self, self.textures.pawn);                  
         pawn.spriteTop = new Kiwi.GameObjects.Sprite(
            self, self.textures.pawnClothes);
         pawn.spriteTop.cellIndex = 1;
         pawn.spriteBottom = new Kiwi.GameObjects.Sprite(
            self, self.textures.pawnClothes);
         pawn.spriteBottom.cellIndex = 2;
         pawn.spriteFoot = new Kiwi.GameObjects.Sprite(
            self, self.textures.pawnClothes);
         pawn.spriteFoot.cellIndex = 3;
         
         pawn.group = new Kiwi.Group(self);
         pawn.group.addChildAt(pawn.sprite, 0);
         pawn.group.addChildAt(pawn.spriteTop, 1);
         pawn.group.addChildAt(pawn.spriteBottom, 1);
         pawn.group.addChildAt(pawn.spriteFoot, 1);

         self.pawnGroup.addChild(pawn.group);

         
         pawn.x = msg.x;
         pawn.y = msg.y;
         applyCoordToSprite(pawn.group, pawn);
         pawn.dirty = true;

      }
      else
      {
         var pawn = self.pawnList.list[pawnIndex];
         applyCoordToSprite(pawn.group, pawn);
         pawn.dirty = true;
      }
   });
   socket.on('removePawn', function(msg) {
      var pawnIndex = self.pawnList.findById(msg.id);
      if(pawnIndex >= 0)
      {
         var pawn = self.pawnList.list[pawnIndex];
         self.pawnGroup(pawn.group);
         self.pawnList.removeByIndex(pawnIndex);
      }
   });
   socket.on('ownedPawn', function(msg) {
      console.log(msg);
      self.ownedPawnId = msg.id;
   });
   socket.on('updatePawn', function(msg) {
      var pawnIndex = self.pawnList.findById(msg.id);
      if(pawnIndex >= 0)
      {
         var pawn = self.pawnList.list[pawnIndex];

         pawn.motion.state          = msg.motion.state;
         pawn.motion.ticksLeft      = msg.motion.ticksLeft;
         pawn.motion.walkSpeedTicks = msg.motion.walkSpeedTicks;
         pawn.motion.target.x       = msg.motion.target.x;
         pawn.motion.target.y       = msg.motion.target.y;
         pawn.lastUpdateWatch       = 0;
         pawn.x = msg.x;
         pawn.y = msg.y;
         pawn.dirty = true;


         
      }
   });
   socket.on('addItem', function(msg) {
      sprite = new Kiwi.GameObjects.Sprite(
         self, self.textures.items);
      var cellIndex = itemImageMap[msg.type];
      if(cellIndex != undefined) {
         sprite.cellIndex = cellIndex;
      }
      else {
         sprite.cellIndex = 0;
      }
      self.itemGroup.addChild(sprite);
      var item = self.itemList.add(msg.id, sprite, msg.type, msg.x, msg.y);
      applyCoordToSprite(sprite, item);

      item.inventoryId = msg.inventoryId;
      if(item.inventoryId == '') {
         item.sprite.visible = true;
      }
      else {
         item.sprite.visible = false;
      }
   });
   socket.on('removeItem', function(msg) {
      var itemIndex = self.itemList.findById(id);
      if(itemIndex >= 0)
      {
         var sprite = pawnList.list[itemIndex].sprite;
         self.itemGroup.removeChild(sprite);
         self.pawnList.remove(itemIndex);
      }
   });
   socket.on('updateItem', function(msg) {
      var itemIndex = self.itemList.findById(msg.id);
      if(itemIndex >= 0)
      {
         var item = self.itemList.list[itemIndex];
         item.inventoryId = msg.inventoryId;
         item.x = msg.x;
         item.y = msg.y;
                  
         applyCoordToSprite(item.sprite, item);
         if(item.inventoryId == '') {
            item.sprite.visible = true;
         }
         else {
            item.sprite.visible = false;
         }
      }
   });
   socket.on('addDoor', function(msg) {
      var door = self.doorList.add(msg.x, msg.y, msg.state);
      door.sprite = new Kiwi.GameObjects.Sprite(
         self, self.textures.doors);
         
      applyCoordToSprite(door.sprite, door);
      if(door.state == 'open') {
         door.sprite.cellIndex = 1;
      }
      else {
         door.sprite.cellIndex = 0;
      }
      self.doorGroup.addChild(door.sprite); 

   });
   socket.on('removeDoor', function(msg) {
      var doorIndex = self.doorList.findByCoord(msg.x, msg.y);
      if(doorIndex >= 0)
      {
         var door = doorList.list[doorIndex];
         state.removeChild(door.sprite);
         self.doorList.removeByIndex(doorIndex);
      }
   });
   socket.on('updateDoor', function(msg) {
      var doorIndex = self.doorList.findByCoord(msg.x, msg.y);
      if(doorIndex >= 0)
      {
         var door = self.doorList.list[doorIndex];         
         door.x = msg.x;
         door.y = msg.y;
         door.state = msg.state;
         door.dirty = true;
      }
   });

   socket.on('chat', function(msg) {
      var rootNode = document.createElement("DIV");
      var chatMessageNode = document.createTextNode(msg.message);
      rootNode.appendChild(chatMessageNode);
      var chatHistoryNode = document.getElementById("chatHistory");
      chatHistoryNode.appendChild(rootNode);
      
      
      // Scroll to the bottom
      chatHistoryNode.scrollTop = chatHistoryNode.scrollHeight;
   });


   // Input
   this.game.input.keyboard.onKeyDownOnce.add(this.keyDownOnce, this);
   this.game.input.keyboard.onKeyUp.add(this.keyUp, this);
};


NodeStation.Play.grab = function() {
   var ownedPawnIndex = this.pawnList.findById(this.ownedPawnId);
   if(ownedPawnIndex >= 0) {
      var ownedPawn = this.pawnList.list[ownedPawnIndex];
      // find the item we are over
      var itemIndex = this.itemList.findByCoord(ownedPawn.x, ownedPawn.y);
      if(itemIndex >= 0) {
         var item = this.itemList.list[itemIndex];
         if(item.inventoryId == '') {
            socket.emit('grab', {
               itemId: item.id
            });
         }
      }
   }
}

NodeStation.Play.drop = function() {
   var ownedPawnIndex = this.pawnList.findById(this.ownedPawnId);
   if(ownedPawnIndex >= 0) {
      var ownedPawn = this.pawnList.list[ownedPawnIndex];
      // find the item we are over
      var itemIndex = this.itemList.findByInventoryId(ownedPawn.id);
      if(itemIndex >= 0) {
         var item = this.itemList.list[itemIndex];
         if(item.inventoryId == ownedPawn.id) {
            socket.emit('drop', {
               itemId: item.id
            });
         }
      }
   }
}

NodeStation.Play.keyDownOnce = function(keyCode, key) {

   var textbox = document.getElementById("chatInputTextbox");
   if(textbox.value == "") {

      var key = undefined;
      if(keyCode == Kiwi.Input.Keycodes.UP) {
         key = 'up';
         textbox.blur();
      }
      else if(keyCode == Kiwi.Input.Keycodes.DOWN) {
         key = 'down';
         textbox.blur();
      }
      else if(keyCode == Kiwi.Input.Keycodes.LEFT) {
         key = 'left';
         textbox.blur();
      }
      else if(keyCode == Kiwi.Input.Keycodes.RIGHT) {
         key = 'right';
         textbox.blur();
      }
      else if(keyCode == Kiwi.Input.Keycodes.G) {
         NodeStation.Play.grab();
      }
      else if(keyCode == Kiwi.Input.Keycodes.D) {
         NodeStation.Play.drop();
      }

      if(key) {
         socket.emit('key', { event: 'down', key: key });
      }
   }
};

NodeStation.Play.keyUp = function(keyCode, key) {
   var key = undefined;
   if(keyCode == Kiwi.Input.Keycodes.UP) {
      key = 'up';
   }
   else if(keyCode == Kiwi.Input.Keycodes.DOWN) {
      key = 'down';
   }
   else if(keyCode == Kiwi.Input.Keycodes.LEFT) {
      key = 'left';
   }
   else if(keyCode == Kiwi.Input.Keycodes.RIGHT) {
      key = 'right';
   }

   if(key) {
      socket.emit('key', { event: 'up', key: key });
   }
};

function chatOnSubmit() {
   var textbox = document.getElementById("chatInputTextbox");
   if(socket) {
      socket.emit('chat', {message: textbox.value});
   }
   textbox.value = "";
   return false;
}


NodeStation.Play.update = function() {

	Kiwi.State.prototype.update.call( this );
   
   // Moving the sprites between updates
   for(var i = 0; i < this.pawnList.list.length; i++) {
      var pawn = this.pawnList.list[i];

      pawn.lastUpdateWatch += this.networkClock.delta;
      if(pawn.motion.state == 'walking') {
         var totalTime = pawn.motion.walkSpeedTicks * this.updateTimeSeconds;
         var timeLeft  = (pawn.motion.ticksLeft * this.updateTimeSeconds) - pawn.lastUpdateWatch;

         //console.log("tl: " + timeLeft + ", tt: " + totalTime + ", ticksLeft: " + pawn.motion.ticksLeft + ", lastUpdateWatch: " + pawn.lastUpdateWatch);
         
      

         if(timeLeft < 0) {
            timeLeft = 0
         }
         else if(timeLeft > totalTime) { 
            timeLeft = totalTime;
         }


         var percent   = 1 - (timeLeft / totalTime);


         var dx = pawn.motion.target.x - pawn.x;
         var dy = pawn.motion.target.y - pawn.y;

         var offsetX = consts.tile.width  * percent * dx;
         var offsetY = consts.tile.height * percent * dy;

         applyCoordToSprite(pawn.group, pawn, offsetX, offsetY);
         pawn.dirty = false;

      }
      else if(pawn.motion.state == 'standing') {
         if(pawn.dirty) {
            applyCoordToSprite(pawn.group, pawn, offsetX, offsetY);
            pawn.dirty = false;
         }

      }
      if(pawn.id == this.ownedPawnId) {
         // Setup the Camera

         var camera = this.game.cameras.defaultCamera;
         this.worldGroup.x = -pawn.group.x + (camera.width  - consts.tile.width)  / 2;
         this.worldGroup.y = -pawn.group.y + (camera.height - consts.tile.height) / 2;
      }

   }
   
   // Updating Doors
   for(var i = 0; i < this.doorList.list.length; i++) {
      var door = this.doorList.list[i];
      if(door.dirty) {
         applyCoordToSprite(door.sprite, door);
         if(door.state == 'open') {
            door.sprite.cellIndex = 1;
         }
         else {
            door.sprite.cellIndex = 0;
         }
      }
   }
};

