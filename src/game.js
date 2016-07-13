/* Copyright 2016, Jeremy Nation <jeremy@jeremynation.me>
 * Released under the GPLv3.
 */
'use strict';
var Game = {};

Game.initialize = function(borderColor, squareDim) {
    Game.borderColor = borderColor;
    Game.squareDim = squareDim;

    Game.finishedRowCount = 0;

    document.addEventListener('keydown', Game.keyDownHandler, false);
    document.addEventListener('keyup', Game.keyUpHandler, false);
    Game.keyPressed = {
        leftArrow: {
            'previous': false,
            'current': false
        },
        rightArrow: {
            'previous': false,
            'current': false
        },
        downArrow: {
            'previous': false,
            'current': false
        }
    };

    // in milliseconds
    Game.downTickDuration = 500;

    Game.lastDownTick = 0;

    Game.directions = {
        DOWN: 'down',
        LEFT: 'left',
        RIGHT: 'right'
    };

    Game.gridStates = {
        EMPTY: 'empty',
        SQUARE: 'square'
    };

    Game.colors = {};
    Game.colors[Game.gridStates.EMPTY] = 'white';
    Game.colors[Game.gridStates.SQUARE] = 'red';

    Game.display = document.getElementById('display');

    var gridWidth = Game.display.width / Game.squareDim;
    var gridHeight = Game.display.height / Game.squareDim;
    if ((gridWidth % 2 !== 0) || (gridHeight % 2 !== 0)) {
        throw new Error('bad grid dimensions');
    } else {
        Game.grid = [];
        for (var rowNum = 0; rowNum < gridHeight; rowNum++) {
            var row = [];
            for (var colNum = 0; colNum < gridWidth; colNum++) {
                row.push({
                    state: Game.gridStates.EMPTY,
                    isActive: false
                });
            }
            Game.grid.push(row);
        }
    }

    Game.allBlocks = [
        [
            [Game.gridStates.SQUARE, Game.gridStates.SQUARE],
            [Game.gridStates.SQUARE, Game.gridStates.SQUARE]
        ]
    ];

    Game.addNewBlock(Game.grid, Game.allBlocks);

    Game.ctx = Game.display.getContext('2d');

    Game.draw(Game.ctx, Game.grid, Game.squareDim);

};

Game.addNewBlock = function(grid, allBlocks) {
    var funcStatus = true;

    var newBlock = allBlocks[Math.floor(Math.random() * allBlocks.length)];
    var startColNum = (grid[0].length / 2) - Math.floor((newBlock[0].length / 2));
    for (var rowNum = 0; rowNum < newBlock.length; rowNum++) {
        for (var colNum = 0; colNum < newBlock[0].length; colNum++) {
            if (grid[rowNum][startColNum + colNum]['state'] === Game.gridStates.EMPTY) {
                grid[rowNum][startColNum + colNum]['state'] = newBlock[0][colNum];
                grid[rowNum][startColNum + colNum]['isActive'] = true;
            } else {
                funcStatus = false;
                break;
            }
        }
        if (!funcStatus) {
            break;
        }
    }

    return funcStatus;
};

Game.moveActiveBlock = function(grid, direction) {
    var funcStatus = true;

    var oldActiveCoords = [];
    for (var rowNum = 0; rowNum < grid.length; rowNum++) {
        for (var colNum = 0; colNum < grid[0].length; colNum++) {
            if (grid[rowNum][colNum]['isActive']) {
                oldActiveCoords.push([rowNum, colNum])
            }
        }
    }

    var moveFunctions = {};
    moveFunctions[Game.directions.LEFT] = function(coord) {
        return [coord[0], coord[1] - 1];
    };
    moveFunctions[Game.directions.RIGHT] = function(coord) {
        return [coord[0], coord[1] + 1];
    };
    moveFunctions[Game.directions.DOWN] = function(coord) {
        return [coord[0] + 1, coord[1]];
    };
    var newActiveCoords = oldActiveCoords.map(moveFunctions[direction]);

    var moveIsAllowed = true;
    for (var i = 0; i < newActiveCoords.length; i++) {
        var newCoord = newActiveCoords[i];
        moveIsAllowed = (
            (0 <= newCoord[0]) && (newCoord[0] < grid.length) &&
            (0 <= newCoord[1]) && (newCoord[1] < grid[0].length) &&
            (
                (grid[newCoord[0]][newCoord[1]]['isActive'] === true) ||
                (grid[newCoord[0]][newCoord[1]]['state'] === Game.gridStates.EMPTY)
            )
        );
        if (!moveIsAllowed) {
            break;
        }
    }

    if (moveIsAllowed) {
        var state = grid[oldActiveCoords[0][0]][oldActiveCoords[0][1]]['state'];
        for (var i = 0; i < oldActiveCoords.length; i++) {
            grid[oldActiveCoords[i][0]][oldActiveCoords[i][1]]['state'] = Game.gridStates.EMPTY;
            grid[oldActiveCoords[i][0]][oldActiveCoords[i][1]]['isActive'] = false;
        }
        for (var i = 0; i < newActiveCoords.length; i++) {
            grid[newActiveCoords[i][0]][newActiveCoords[i][1]]['state'] = state;
            grid[newActiveCoords[i][0]][newActiveCoords[i][1]]['isActive'] = true;
        }
    }

    funcStatus = moveIsAllowed;
    return funcStatus;
};

Game.clearMatchedRows = function(grid) {
    var finishedRowNums = [];
    for (var rowNum = 0; rowNum < grid.length; rowNum++) {
        var emptyCols = grid[rowNum].filter(function(col) {
            return col['state'] === Game.gridStates.EMPTY;
        });
        if (emptyCols.length === 0) {
            finishedRowNums.push(rowNum);
        }
    }
    for (var i = 0; i < finishedRowNums.length; i++) {
        var finishedRowNum = finishedRowNums[i];
        for (var colNum = 0; colNum < grid[0].length; colNum++) {
            grid[finishedRowNum][colNum]['state'] = Game.gridStates.EMPTY;
        }
        for (rowNum = finishedRowNum-1; rowNum >= 0; rowNum--) {
            for (colNum = 0; colNum < grid[0].length; colNum++) {
                grid[rowNum+1][colNum]['state'] = grid[rowNum][colNum]['state'];
                grid[rowNum][colNum]['state'] = Game.gridStates.EMPTY;
            }
        }
        Game.finishedRowCount++;
    }

    console.log('Game.finishedRowCount: ' + Game.finishedRowCount);
};

Game.update = function(grid, timeFrame) {
    var keepGoing = true;

    if (Game.keyPressed['leftArrow']['current'] &&
        !Game.keyPressed['leftArrow']['previous']) {
        Game.moveActiveBlock(grid, Game.directions.LEFT);
    } else if (Game.keyPressed['rightArrow']['current'] &&
        !Game.keyPressed['rightArrow']['previous']) {
        Game.moveActiveBlock(grid, Game.directions.RIGHT);
    } else if (Game.keyPressed['downArrow']['current'] &&
        !Game.keyPressed['downArrow']['previous']) {
        Game.moveActiveBlock(grid, Game.directions.DOWN);
    }

    Game.keyPressed['leftArrow']['previous'] = Game.keyPressed['leftArrow']['current'];
    Game.keyPressed['rightArrow']['previous'] = Game.keyPressed['rightArrow']['current'];
    Game.keyPressed['downArrow']['previous'] = Game.keyPressed['downArrow']['current'];

    if (timeFrame > (Game.lastDownTick + Game.downTickDuration)) {
        Game.lastDownTick = timeFrame;
        var moveWorked = Game.moveActiveBlock(grid, Game.directions.DOWN);

        if (!moveWorked) {
            for (var rowNum = 0; rowNum < grid.length; rowNum++) {
                for (var colNum = 0; colNum < grid[0].length; colNum++) {
                    grid[rowNum][colNum]['isActive'] = false;
                }
            }

            Game.clearMatchedRows(grid);

            keepGoing = Game.addNewBlock(grid, Game.allBlocks);
        }
    }
    return keepGoing;
};

Game.draw = function(ctx, grid, squareDim) {
    ctx.strokeStyle = Game.borderColor;
    for (var rowNum = 0; rowNum < grid.length; rowNum++) {
        for (var colNum = 0; colNum < grid[0].length; colNum++) {
            ctx.fillStyle = Game.colors[grid[rowNum][colNum]['state']];
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

Game.keyDownHandler = function(e) {
    if (e.keyCode === 37) {
        Game.keyPressed['leftArrow']['current'] = true;
    } else if (e.keyCode === 39) {
        Game.keyPressed['rightArrow']['current'] = true;
    } else if (e.keyCode === 40) {
        Game.keyPressed['downArrow']['current'] = true;
    }
};

Game.keyUpHandler = function(e) {
    if (e.keyCode === 37) {
        Game.keyPressed['leftArrow']['current'] = false;
    } else if (e.keyCode === 39) {
        Game.keyPressed['rightArrow']['current'] = false;
    } else if (e.keyCode === 40) {
        Game.keyPressed['downArrow']['current'] = false;
    }
};

Game.main = function(timeFrame) {
    var keepGoing = Game.update(Game.grid, timeFrame);
    Game.draw(Game.ctx, Game.grid, Game.squareDim);
    if (keepGoing) {
        window.requestAnimationFrame(Game.main);
    } else {
        console.log('game over!');
    }
};
