/* Copyright 2016, Jeremy Nation <jeremy@jeremynation.me>
 * Released under the GPLv3.
 */
var Game = {};

Game.borderColor = 'black';
Game.emptyColor = 'white';

Game.squareDim = 50;

Game.getEmptyGrid = function(gridWidth, gridHeight) {
    if ((parseInt(gridWidth) !== gridWidth) ||
        (parseInt(gridHeight) !== gridHeight)) {
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
            ctx.rect(
                colNum * squareDim,
                rowNum * squareDim,
                squareDim,
                squareDim
            );
            ctx.fillStyle = grid[rowNum][colNum];
            ctx.fill();
            ctx.stroke();
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

    this.drawGrid(ctx, grid, this.squareDim);
};
