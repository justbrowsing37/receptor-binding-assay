// --- LInk to new code: [Insert Link here] --- \\

// --- Constants and Game Settings --- \\
var TILE_SIZE = Math.floor(getWidth() / 7);
var BOARD_COLS = 7;
var BOARD_ROWS = 7;
var BOARD_OFFSET_X = (getWidth() - TILE_SIZE * BOARD_COLS) / 2;
var BOARD_OFFSET_Y = (getHeight() - TILE_SIZE * BOARD_ROWS) / 2;
var BALL_RADIUS = 7;

// --- Miscellaneous --- \\
var boardSpaces = [];
var groupTiles = [];
var chanceDeck = [], communityChestDeck = [];
var cardDisplay;
var cardPopup = null;
var cardContinueBtn = null;
var pendingTile = null;

// --- Players & Player UI --- \\
var roll1;
var roll2;
var player1, player2, players;
var currentPlayerIndex = 0;
var diceLabel, player1MoneyText, player2MoneyText, turnLabel;
var gameStarted = false;

// --- Audio Utility --- \\
function playSound(fileName) {
    var audio = new Audio(fileName);
    audio.play();
}

// --- Tile Info --- \\
var groupTilePlan = [
    { name: "Sml Twn Hse", color: "#8B4513", value: 100000, count: 2 },
    { name: "Sml Apt", color: "#00FFFF", value: 200000, count: 3 },
    { name: "Lrg Apt", color: "#800080", value: 300000, count: 3 },
    { name: "Lrg Twn Hse", color: "#FFA500", value: 400000, count: 3 },
    { name: "Cottage", color: "#FF0000", value: 500000, count: 3 },
    { name: "Semi", color: "#FFFF00", value: 600000, count: 3 },
    { name: "Single", color: "#008000", value: 700000, count: 3 },
];

// --- Code starts here --- \\
function start() {
    showTitleScreen();
}

function showTitleScreen() {
    var title = new Text("Canadian Housing Monopoly", "20pt Arial");
    title.setPosition(getWidth() / 2 - title.getWidth() / 2, 100);
    add(title);

    var startBtn = new Rectangle(150, 40);
    startBtn.setPosition(getWidth() / 2 - 75, 200);
    startBtn.setColor("#00BFFF");
    add(startBtn);

    var startText = new Text("Start Game", "12pt Arial");
    startText.setPosition(getWidth() / 2 - startText.getWidth() / 2, 225);
    add(startText);

    mouseClickMethod(function (e) {
        if (!gameStarted && e.getX() > startBtn.getX() && e.getX() < startBtn.getX() + startBtn.getWidth() &&
            e.getY() > startBtn.getY() && e.getY() < startBtn.getY() + startBtn.getHeight()) {
            gameStarted = true;
            remove(title);
            remove(startBtn);
            remove(startText);
            initGame();
        }
    });
}

function initGame() {
    initGroupTiles();
    initCardDecks();
    drawBoard();
    setupPlayers();
    drawUI();
    mouseClickMethod(handleGameCLick);
}

function handleGameCLick(e) {
    if (cardContinueBtn && cardContinueBtn.containsPoint(e.getX(), e.getY())) {
        if (pendingTile.cardType === "Chance") {
            let card = chanceDeck.shift();
            chanceDeck.push(card);
            cardDisplay.setText(`Chance: ${card.description}`);
            card.action(players[currentPlayerIndex]);
        } else if (pendingTile.cardType === "Community Chest") {
            let card = communityChestDeck.shift();
            communityChestDeck.push(card);
            cardDisplay.setText(`Community Chest: ${card.description}`);
            card.action(players[currentPlayerIndex]);
        }

        if (pendingTile.highlight) remove(pendingTile.highlight);
        if (cardPopup) {
            remove(cardPopup);
            remove(cardPopup.text);
        }
        if (cardContinueBtn) {
            remove(cardContinueBtn);
            remove(cardContinueBtn.label);
        }

        cardPopup = null;
        cardContinueBtn = null;
        pendingTile = null;

        updateMoneyUI();
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        takeTurn(); // Resume game

    } else if (pendingTile === null) {
        takeTurn();
        cardDisplay.setText("");
    }
}

function initGroupTiles() {
    groupTilePlan.forEach(group => {
        for (var i = 0; i < group.count; i++) {
            groupTiles.push({ name: group.name, color: group.color, value: group.value });
        }
    });

    // Add special tiles for Chance and Community Chest at fixed intervals
    groupTiles.splice(5, 0, { name: "Chance", color: "#ccb581", value: 0 });
    groupTiles.splice(10, 0, { name: "Community Chest", color: "#D3D3D3", value: 0 });
    groupTiles.splice(15, 0, { name: "Chance", color: "#ccb581", value: 0 });
    groupTiles.splice(20, 0, { name: "Community Chest", color: "#D3D3D3", value: 0 });
}

function drawBoard() {
    var index = 0;
    for (var col = 0; col < BOARD_COLS; col++) placeTile(index++, col, 0);
    for (var row = 1; row < BOARD_ROWS; row++) placeTile(index++, BOARD_COLS - 1, row);
    for (var col = BOARD_COLS - 2; col >= 0; col--) placeTile(index++, col, BOARD_ROWS - 1);
    for (var row = BOARD_ROWS - 2; row > 0; row--) placeTile(index++, 0, row);
}

function placeTile(index, col, row) {
    var group = groupTiles[index % groupTiles.length];
    var x = BOARD_OFFSET_X + col * TILE_SIZE;
    var y = BOARD_OFFSET_Y + row * TILE_SIZE;

    var rect = new Rectangle(TILE_SIZE, TILE_SIZE);
    rect.setPosition(x, y);
    rect.setColor(group.color);
    add(rect);

    var label = new Text(`${group.name}`, "8pt Arial");
    label.setPosition(x + 5, y + 15);
    add(label);

    boardSpaces.push({
        rect, owner: null, group: group.name, value: group.value,
        ownerLabel: null, houses: 0, hasHotel: false
    });
}

function setupPlayers() {
    player1 = createPlayer("Purple", "#C300FF", -10);
    player2 = createPlayer("Black", "#000000", 10);
    players = [player1, player2];
    players.forEach(player => add(player.token));
    players.forEach(updatePlayerPosition);
}

function createPlayer(name, color, yOffset) {
    return { name, color, tileIndex: 0, money: 5000000, yOffset, token: createToken(color), skippedTurn: false };
}

function createToken(color) {
    var token = new Circle(BALL_RADIUS);
    token.setColor(color);
    token.setBorderColor('#FFC0CB')
    return token;
}

function drawUI() {
    diceLabel = new Text("", "10pt Arial");
    diceLabel.setPosition(getWidth(), getHeight());
    add(diceLabel);

    player1MoneyText = new Text("", "10pt Arial");
    player1MoneyText.setPosition(10, getHeight() - 30);
    add(player1MoneyText);

    player2MoneyText = new Text("", "10pt Arial");
    player2MoneyText.setPosition(10, getHeight() - 15);
    add(player2MoneyText);

    turnLabel = new Text("", "12pt Arial");
    turnLabel.setPosition(turnLabel.getWidth(), turnLabel.getHeight());
    add(turnLabel);

    cardDisplay = new Text("", "12pt Arial");
    cardDisplay.setPosition(getWidth() / 2 - 100, getHeight() - 50);
    add(cardDisplay);

    updateMoneyUI();
}

function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initCardDecks() {
    chanceDeck = shuffle([
        { description: "Advance to the start and collect $50,000", action: player => { movePlayerTo(player, 0); player.money += 50000; } },
        { description: "Pay school fees of $150,000", action: player => player.money -= 150000 },
        { description: "Go back 3 spaces", action: player => movePlayerBy(player, -3) },
        { description: "Lose a turn", action: player => player.skippedTurn = true }
    ]);

    communityChestDeck = shuffle([
        { description: "Bank error in your favor, collect $200,000", action: player => player.money += 200000 },
        { description: "Doctor’s fees, pay $50,000", action: player => player.money -= 50000 },
        { description: "From sale of stock, you get $50,000", action: player => player.money += 50000 },
        { description: "Lose a turn", action: player => player.skippedTurn = true }
    ]);
}

function updateMoneyUI() {
    player1MoneyText.setText(`Purple: $${player1.money}`);
    player2MoneyText.setText(`Black: $${player2.money}`);
    turnLabel.setText(`Turn: ${players[currentPlayerIndex].name}`);
}

function updatePlayerPosition(player) {
    var tile = boardSpaces[player.tileIndex].rect;
    player.token.setPosition(tile.getX() + TILE_SIZE / 2, tile.getY() + TILE_SIZE / 2 + player.yOffset);
}

function movePlayerTo(player, tileIndex) {
    player.tileIndex = tileIndex % boardSpaces.length;
    updatePlayerPosition(player);
}

function movePlayerBy(player, offset) {
    player.tileIndex = (player.tileIndex + offset + boardSpaces.length) % boardSpaces.length;
    updatePlayerPosition(player);
}

function takeTurn() {
    var player = players[currentPlayerIndex];
    var roll = Math.ceil(Math.random() * 6);
    diceLabel.setText(`${player.name} rolled: ${roll}`);
    diceLabel.setPosition(getWidth() - diceLabel.getWidth(), getHeight() - diceLabel.getHeight());

    player.tileIndex = (player.tileIndex + roll) % boardSpaces.length;
    updatePlayerPosition(player);
    handleTile(player, player.tileIndex);
    updateMoneyUI();

    if (player.money <= 0) {
        println(`${player.name} is bankrupt! Game over.`);
        mouseClickMethod(null);
        return;
    }

    // Switch to next player
    if (!pendingTile) {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    }
}

function drawHouse(tile) {
    if (!tile.houseCircles) tile.houseCircles = [];
    var house = new Circle(4);
    house.setColor("#228B22");
    let offsetX = tile.rect.getX() + 5 + (tile.houses - 1) * 10;
    let offsetY = tile.rect.getY() + TILE_SIZE - 12;
    house.setPosition(offsetX, offsetY);
    add(house);
    tile.houseCircles.push(house);
}

function drawHotel(tile) {
    if (tile.houseCircles) tile.houseCircles.forEach(remove);
    tile.houseCircles = [];
    var hotel = new Rectangle(20, 20);
    hotel.setColor("#8B0000");
    hotel.setPosition(tile.rect.getX() + TILE_SIZE / 2 - 10, tile.rect.getY() + TILE_SIZE / 2 - 10);
    add(hotel);
    tile.hotelVisual = hotel;
}

function handleTile(player, index) {
    var tile = boardSpaces[index];

    if (tile.group === "Chance" || tile.group === "Community Chest") {
        pendingTile = tile;
        pendingTile.cardType = tile.group;
        highlightTile(tile);

        playSound("draw-card.mp3");

        cardPopup = new Rectangle(200, 100);
        cardPopup.setPosition(getWidth() / 2 - 100, getHeight() / 2 - 50);
        cardPopup.setColor("#FFFFFF");
        add(cardPopup);

        let cardText = new Text(`${tile.group} - Click OK to reveal card`, "10pt Arial");
        cardText.setPosition(cardPopup.getX() + 10, cardPopup.getY() + 30);
        add(cardText);
        cardPopup.text = cardText;

        cardContinueBtn = new Rectangle(60, 30);
        cardContinueBtn.setPosition(cardPopup.getX() + 70, cardPopup.getY() + 60);
        cardContinueBtn.setColor("#00BFFF");
        add(cardContinueBtn);

        let btnLabel = new Text("OK", "12pt Arial");
        btnLabel.setPosition(cardContinueBtn.getX() + 18, cardContinueBtn.getY() + 8);
        add(btnLabel);
        cardContinueBtn.label = btnLabel;

        return;
    }

    if (tile.owner === null) {
        if (player.money >= tile.value && confirm(`${player.name}: Buy ${tile.group} tile for $${tile.value}?`)) {
            tile.owner = player;
            player.money -= tile.value;
            println(`${player.name} bought '${tile.group}' tile for $${tile.value}`);
            playSound("buy-property.mp3");
        }
    } else if (tile.owner !== player) {
        var rent = Math.round(tile.value * 0.1);
        if (tile.houses > 0) rent += tile.houses * 0.05 * tile.value;
        if (tile.hasHotel) rent += 0.5 * tile.value;
        rent = Math.min(rent, player.money);
        player.money -= rent;
        tile.owner.money += rent;
        println(`${player.name} paid $${rent} rent to ${tile.owner.name}`);
        playSound("pay-rent.mp3");
    } else {
        if (tile.houses < 4 && !tile.hasHotel && confirm(`${player.name}: Build house for $${Math.floor(tile.value * 0.25)}?`)) {
            player.money -= Math.floor(tile.value * 0.25);
            tile.houses++;
            drawHouse(tile);
            println(`${player.name} built a house`);
        } else if (tile.houses === 4 && !tile.hasHotel && confirm(`${player.name}: Upgrade to hotel for $${Math.floor(tile.value * 0.5)}?`)) {
            player.money -= Math.floor(tile.value * 0.5);
            tile.houses = 0;
            tile.hasHotel = true;
            drawHotel(tile);
            println(`${player.name} built a hotel`);
        }
    }

    if (tile.owner && !tile.ownerLabel) {
        tile.ownerLabel = new Text(tile.owner.name, "8pt Arial");
        tile.ownerLabel.setPosition(tile.rect.getX() + 5, tile.rect.getY() + TILE_SIZE / 2);
        add(tile.ownerLabel);
    }
}

function highlightTile(tile) {
    var border = new Rectangle(TILE_SIZE, TILE_SIZE);
    border.setPosition(tile.rect.getX(), tile.rect.getY());
    border.setColor("#FFD700");
    border.setBorderColor("#FFD700");
    border.setBorderWidth(4);
    border.setFilled(false);
    tile.highlight = border;
    add(border);
}

function showCardPopup(text) {
    cardPopup = new Rectangle(240, 120);
    cardPopup.setPosition(getWidth() / 2 - 120, getHeight() / 2 - 60);
    cardPopup.setColor("#F8F9F9");
    cardPopup.setBorderColor("#333");
    cardPopup.setBorderWidth(2);
    add(cardPopup);

    cardPopup.text = new Text(text, "14pt Arial");
    cardPopup.text.setPosition(cardPopup.getX() + 20, cardPopup.getY() + 50);
    cardPopup.text.setColor("#2C3E50");
    add(cardPopup.text);

    cardContinueBtn = new Rectangle(100, 35);
    cardContinueBtn.setPosition(cardPopup.getX() + 70, cardPopup.getY() + 70);
    cardContinueBtn.setColor("#3498DB");
    cardContinueBtn.setBorderColor("#1F618D");
    cardContinueBtn.setBorderWidth(2);
    add(cardContinueBtn);

    cardContinueBtn.label = new Text("Continue", "12pt Arial bold");
    cardContinueBtn.label.setPosition(cardContinueBtn.getX() + 15, cardContinueBtn.getY() + 23);
    cardContinueBtn.label.setColor("white");
    add(cardContinueBtn.label);
}

function endTurn() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateMoneyUI();
}

function startingOrderRoll() {
}