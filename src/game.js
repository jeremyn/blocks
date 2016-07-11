/* Copyright 2016, Jeremy Nation <jeremy@jeremynation.me>
 * Released under the GPLv3.
 */
var Game = {};

Game.getEmptyGrid = function(gridWidth, gridHeight) {
    if ((gridWidth % 2 !== 0) ||
        (gridHeight % 2 !== 0)) {
        throw new Error('bad grid dimensions');
    }

    var grid = [];
    for (var i = 0; i < gridHeight; i++) {
        grid.push(Array(gridWidth).fill(Game.emptyColor));
    }
    return grid;
};

Game.getBlocks = function(emptyColor) {
    return [
        [
            [emptyColor, 'red', 'red', emptyColor],
            [emptyColor, 'red', 'red', emptyColor]
        ]
    ];
};

Game.initialize = function(borderColor, emptyColor, squareDim) {
    Game.borderColor = borderColor;
    Game.emptyColor = emptyColor;
    Game.squareDim = squareDim;

    Game.display = document.getElementById('display');
    Game.ctx = Game.display.getContext('2d');
    Game.grid = Game.getEmptyGrid(
        Game.display.width / Game.squareDim,
        Game.display.height / Game.squareDim
    );
    Game.blocks = Game.getBlocks(Game.emptyColor);
};

Game.update = function(grid) {
    var newBlockStartPosition = (grid[0].length / 2) - 2;

    var newBlock = Game.blocks[
        Math.floor(Math.random() * (Game.blocks.length))
        ];

    for (var i = 0; i < newBlock[0].length; i++) {
        grid[0][newBlockStartPosition + i] = newBlock[0][i];
        grid[1][newBlockStartPosition + i] = newBlock[1][i];
    }
};

Game.draw = function(ctx, grid, squareDim) {
    ctx.strokeStyle = Game.borderColor;
    for (var rowNum = 0; rowNum < grid.length; rowNum++) {
        for (var colNum = 0; colNum < grid[0].length; colNum++) {
            ctx.fillStyle = grid[rowNum][colNum];
            ctx.fillRect(
                colNum * squareDim,
                rowNum * squareDim,
                squareDim,
                squareDim
            );
            ctx.strokeRect(
                colNum * squareDim,
                rowNum * squareDim,
                squareDim,
                squareDim
            );
        }
    }
};

Game.main = function() {
    Game.update(Game.grid);
    Game.draw(Game.ctx, Game.grid, Game.squareDim);
};
