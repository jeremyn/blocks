/* Copyright 2016, Jeremy Nation <jeremy@jeremynation.me>
 * Released under the GPLv3.
 */
var Game = {};

Game.borderColor = 'black';
Game.emptyColor = 'white';

Game.squareDim = 50;

Game.blocks = [
    [
        [Game.emptyColor, 'red', 'red', Game.emptyColor],
        [Game.emptyColor, 'red', 'red', Game.emptyColor]
    ]
];

Game.getEmptyGrid = function(gridWidth, gridHeight) {
    if ((gridWidth % 2 !== 0) ||
        (gridHeight % 2 !== 0)) {
        throw new Error('bad grid dimensions');
    }

    var grid = [];
    for (var i = 0; i < gridHeight; i++) {
        grid.push(Array(gridWidth).fill(this.emptyColor));
    }
    return grid;
};

Game.drawGrid = function(ctx, grid, squareDim) {
    ctx.strokeStyle = this.borderColor;
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
    var display = document.getElementById('display');

    var grid = this.getEmptyGrid(
        display.width / this.squareDim,
        display.height / this.squareDim
    );

    var ctx = display.getContext('2d');

    var newBlockStartPosition = (grid[0].length / 2) - 2;

    var newBlock = Game.blocks[
        Math.floor(Math.random() * (Game.blocks.length))
    ];

    for (var i = 0; i < newBlock[0].length; i++) {
        grid[0][newBlockStartPosition+i] = newBlock[0][i];
        grid[1][newBlockStartPosition+i] = newBlock[1][i];
    }

    this.drawGrid(ctx, grid, this.squareDim);
};
