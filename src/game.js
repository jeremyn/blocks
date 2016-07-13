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
        left: {
            'previous': false,
            'current': false
        },
        right: {
            'previous': false,
            'current': false
        },
        down: {
            'previous': false,
            'current': false
        },
        counterClockwise: {
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
        RIGHT: 'right',
        COUNTERCLOCKWISE: 'counterclockwise'
    };

    Game.gridStates = {
        EMPTY: 'empty',
        L: 'l',
        SQUARE: 'square',
        STRAIGHT: 'straight',
        T: 't',
        Z: 'z'
    };

    Game.colors = {};
    Game.colors[Game.gridStates.EMPTY] = 'white';
    Game.colors[Game.gridStates.L] = 'silver';
    Game.colors[Game.gridStates.SQUARE] = 'red';
    Game.colors[Game.gridStates.STRAIGHT] = 'fuchsia';
    Game.colors[Game.gridStates.T] = 'lime';
    Game.colors[Game.gridStates.Z] = 'aqua';

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
            [Game.gridStates.L, Game.gridStates.L, Game.gridStates.L],
            [Game.gridStates.L, Game.gridStates.EMPTY, Game.gridStates.EMPTY]
        ],
        [
            [Game.gridStates.SQUARE, Game.gridStates.SQUARE],
            [Game.gridStates.SQUARE, Game.gridStates.SQUARE]
        ],
        [
            [Game.gridStates.STRAIGHT, Game.gridStates.STRAIGHT, Game.gridStates.STRAIGHT, Game.gridStates.STRAIGHT]
        ],
        [
            [Game.gridStates.T, Game.gridStates.T, Game.gridStates.T],
            [Game.gridStates.EMPTY, Game.gridStates.T, Game.gridStates.EMPTY]
        ],
        [
            [Game.gridStates.Z, Game.gridStates.Z, Game.gridStates.EMPTY],
            [Game.gridStates.EMPTY, Game.gridStates.Z, Game.gridStates.Z]
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
            var gridCell = grid[rowNum][startColNum + colNum];
            var blockCellState = newBlock[rowNum][colNum];
            if (blockCellState !== Game.gridStates.EMPTY) {
                if (gridCell['state'] === Game.gridStates.EMPTY) {
                    gridCell['state'] = blockCellState;
                    gridCell['isActive'] = true;
                } else {
                    funcStatus = false;
                    break;
                }
            }
        }
        if (!funcStatus) {
            break;
        }
    }

    return funcStatus;
};

Game.getActiveBlockCoords = function(grid) {
    var activeBlockCoords = [];
    for (var rowNum = 0; rowNum < grid.length; rowNum++) {
        for (var colNum = 0; colNum < grid[0].length; colNum++) {
            if (grid[rowNum][colNum]['isActive']) {
                activeBlockCoords.push([rowNum, colNum])
            }
        }
    }
    return activeBlockCoords;
};

Game.updateActiveBlockPosition = function(grid, oldActiveCoords, newActiveCoords) {
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
    return moveIsAllowed;
};

Game.moveActiveBlock = function(grid, direction) {
    var oldActiveCoords = Game.getActiveBlockCoords(grid);

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

    return Game.updateActiveBlockPosition(grid, oldActiveCoords, newActiveCoords);
};

Game.rotateActiveBlock = function(grid, direction) {
    var oldActiveCoords = Game.getActiveBlockCoords(grid);
    var rows = oldActiveCoords.map(function(c) {return c[0];});
    rows.sort(function(a,b){ return a-b; });
    var cols = oldActiveCoords.map(function(c) {return c[1];});
    cols.sort(function(a,b){ return a-b; });
    var newActiveCoords = [];
    for (var i = 0; i < oldActiveCoords.length; i++) {
        var newRow, newCol;
        if (direction === Game.directions.COUNTERCLOCKWISE) {
            if (cols.length >= rows.length) {
                newRow = rows[0]+((cols[cols.length-1]-cols[0])-(oldActiveCoords[i][1]-cols[0]));
                newCol = cols[0]+(oldActiveCoords[i][0]-rows[0]);
            } else {
                newRow = rows[0]+(oldActiveCoords[i][1]-cols[0]);
                newCol = cols[0]+((rows[rows.length-1]-rows[0])-(oldActiveCoords[i][0]-rows[0]));
            }
        }
        newActiveCoords.push([newRow, newCol]);
    }

    return Game.updateActiveBlockPosition(grid, oldActiveCoords, newActiveCoords);
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

    if (Game.keyPressed['left']['current'] &&
        !Game.keyPressed['left']['previous']) {
        Game.moveActiveBlock(grid, Game.directions.LEFT);
    } else if (Game.keyPressed['right']['current'] &&
        !Game.keyPressed['right']['previous']) {
        Game.moveActiveBlock(grid, Game.directions.RIGHT);
    } else if (Game.keyPressed['down']['current'] &&
        !Game.keyPressed['down']['previous']) {
        Game.moveActiveBlock(grid, Game.directions.DOWN);
    } else if (Game.keyPressed['counterClockwise']['current'] &&
        !Game.keyPressed['counterClockwise']['previous']) {
        Game.rotateActiveBlock(grid, Game.directions.COUNTERCLOCKWISE);
    }

    Game.keyPressed['left']['previous'] = Game.keyPressed['left']['current'];
    Game.keyPressed['right']['previous'] = Game.keyPressed['right']['current'];
    Game.keyPressed['down']['previous'] = Game.keyPressed['down']['current'];
    Game.keyPressed['counterClockwise']['previous'] = Game.keyPressed['counterClockwise']['current'];

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
        Game.keyPressed['left']['current'] = true;
    } else if (e.keyCode === 39) {
        Game.keyPressed['right']['current'] = true;
    } else if (e.keyCode === 40) {
        Game.keyPressed['down']['current'] = true;
    } else if (e.keyCode === 90) {
        Game.keyPressed['counterClockwise']['current'] = true;
    }
};

Game.keyUpHandler = function(e) {
    if (e.keyCode === 37) {
        Game.keyPressed['left']['current'] = false;
    } else if (e.keyCode === 39) {
        Game.keyPressed['right']['current'] = false;
    } else if (e.keyCode === 40) {
        Game.keyPressed['down']['current'] = false;
    } else if (e.keyCode === 90) {
        Game.keyPressed['counterClockwise']['current'] = false;
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
