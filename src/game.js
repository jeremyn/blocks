/* Copyright 2016, Jeremy Nation <jeremy@jeremynation.me>
 * Released under the GPLv3.
 */
'use strict';
var Game = {};

Game.initialize = function(borderColor, squareDim, canvasId) {
    Game.borderColor = borderColor;
    Game.squareDim = squareDim;
    Game.borderLineWidth = 6;
    Game.gridLineWidth = 1;

    Game.finishedRowCount = 0;

    Game.keyCodes = {
        SPACE: 32,
        LEFT_ARROW: 37,
        RIGHT_ARROW: 39,
        DOWN_ARROW: 40,
        C: 67,
        X: 88,
        Z: 90
    };

    Game.controlsHelp = [
        "Pause/unpause: \<space\>",
        "Move block: left/right/down arrow",
        "Rotate counterclockwise: 'z'",
        "Reflect around y-axis: 'x'",
        "Rotate clockwise: 'c'"
    ];

    Game.fontSuffix = 'px serif';

    Game.isPaused = true;
    Game.isNewlyPaused = true;

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
        clockwise: {
            'previous': false,
            'current': false
        },
        counterClockwise: {
            'previous': false,
            'current': false
        },
        reflect: {
            'previous': false,
            'current': false
        },
        pause: {
            'previous': false,
            'current': false
        }
    };

    // in milliseconds
    Game.downTickDuration = 500;

    Game.lastDownTick = 0;

    Game.actions = {
        DOWN: 'down',
        LEFT: 'left',
        RIGHT: 'right',
        CLOCKWISE: 'clockwise',
        COUNTERCLOCKWISE: 'counterclockwise',
        REFLECT: 'reflect',  // reflect around y-axis
        PAUSE: 'pause'
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

    Game.display = document.getElementById(canvasId);

    Game.statusBarHeight = 50;

    var gridWidth = Game.display.width / Game.squareDim;
    var gridHeight = (Game.display.height - Game.statusBarHeight) / Game.squareDim;
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

Game.getUpdatedCoords = function(oldCoords, action) {
    var newCoords;
    if (action === Game.actions.CLOCKWISE) {
        newCoords = oldCoords;
        for (var j = 0; j < 3; j++) {
            newCoords = Game.getUpdatedCoords(newCoords, Game.actions.COUNTERCLOCKWISE);
        }
    } else {
        var rows = oldCoords.map(function(c) { return c[0]; });
        rows.sort(function(a,b){ return a-b; });
        var minRow = rows[0];

        var cols = oldCoords.map(function(c) { return c[1]; });
        cols.sort(function(a,b){ return a-b; });
        var minCol = cols[0];
        var maxCol = cols[cols.length-1];

        newCoords = [];
        for (var i = 0; i < oldCoords.length; i++) {
            var oldRow = oldCoords[i][0];
            var oldCol = oldCoords[i][1];
            var newRow;
            var newCol;
            if (action === Game.actions.LEFT) {
                newRow = oldRow;
                newCol = oldCol-1;
            } else if (action === Game.actions.RIGHT) {
                newRow = oldRow;
                newCol = oldCol+1;
            } else if (action === Game.actions.DOWN) {
                newRow = oldRow+1;
                newCol = oldCol;
            } else if (action === Game.actions.COUNTERCLOCKWISE) {
                newRow = minRow+((maxCol-minCol)-(oldCol-minCol));
                newCol = minCol+(oldRow-minRow);

                // adjust behavior for straight-block
                if (new Set(rows).size === 1) {
                    newCol++;
                } else if (new Set(cols).size === 1) {
                    newCol--;
                }
            } else if (action === Game.actions.REFLECT) {
                newRow = oldRow;
                newCol = maxCol - oldCol + minCol;
            }
            newCoords.push([newRow, newCol]);
        }
    }
    return newCoords;
};

Game.moveActiveBlock = function(grid, action) {
    var oldActiveCoords = Game.getActiveBlockCoords(grid);
    var newActiveCoords = Game.getUpdatedCoords(oldActiveCoords, action);
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
};

Game.processMovementKeys = function(grid) {
    if (Game.keyPressed['left']['current'] &&
        !Game.keyPressed['left']['previous']) {
        Game.moveActiveBlock(grid, Game.actions.LEFT);
    } else if (Game.keyPressed['right']['current'] &&
        !Game.keyPressed['right']['previous']) {
        Game.moveActiveBlock(grid, Game.actions.RIGHT);
    } else if (Game.keyPressed['down']['current'] &&
        !Game.keyPressed['down']['previous']) {
        Game.moveActiveBlock(grid, Game.actions.DOWN);
    } else if (Game.keyPressed['clockwise']['current'] &&
        !Game.keyPressed['clockwise']['previous']) {
        Game.moveActiveBlock(grid, Game.actions.CLOCKWISE);
    } else if (Game.keyPressed['counterClockwise']['current'] &&
        !Game.keyPressed['counterClockwise']['previous']) {
        Game.moveActiveBlock(grid, Game.actions.COUNTERCLOCKWISE);
    } else if (Game.keyPressed['reflect']['current'] &&
        !Game.keyPressed['reflect']['previous']) {
        Game.moveActiveBlock(grid, Game.actions.REFLECT);
    }

    Game.keyPressed['left']['previous'] = Game.keyPressed['left']['current'];
    Game.keyPressed['right']['previous'] = Game.keyPressed['right']['current'];
    Game.keyPressed['down']['previous'] = Game.keyPressed['down']['current'];
    Game.keyPressed['clockwise']['previous'] = Game.keyPressed['clockwise']['current'];
    Game.keyPressed['counterClockwise']['previous'] = Game.keyPressed['counterClockwise']['current'];
    Game.keyPressed['reflect']['previous'] = Game.keyPressed['reflect']['current'];
};

Game.processDownwardTick = function(grid, timeFrame) {
    var keepGoing = true;
    if (timeFrame > (Game.lastDownTick + Game.downTickDuration)) {
        Game.lastDownTick = timeFrame;
        var moveWorked = Game.moveActiveBlock(grid, Game.actions.DOWN);

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

Game.update = function(grid, timeFrame) {
    var keepGoing = true;
    if (Game.keyPressed['pause']['current'] &&
        !Game.keyPressed['pause']['previous']) {
        if (Game.isPaused) {
            Game.isPaused = false;
        } else {
            Game.isPaused = true;
            Game.isNewlyPaused = true;
        }
    }
    Game.keyPressed['pause']['previous'] = Game.keyPressed['pause']['current'];

    if (!Game.isPaused) {
        Game.processMovementKeys(grid);
        Game.processDownwardTick(grid, timeFrame);
        keepGoing = Game.processDownwardTick(grid, timeFrame);
    }

    return keepGoing;
};

Game.drawPauseScreen = function(ctx, pauseText) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, Game.display.width, Game.display.height - Game.statusBarHeight);

    var fontHeight = 0.5 * Game.statusBarHeight;
    var pauseBoxHeight = 1.05 * fontHeight * (pauseText.length + 0.5);
    var pauseBoxStartRow = 0.5 * (Game.display.height - Game.statusBarHeight - pauseBoxHeight);

    ctx.fillStyle = Game.colors[Game.gridStates.EMPTY];
    ctx.strokeStyle = Game.borderColor;
    ctx.fillRect(
        0.5 * Game.squareDim,
        pauseBoxStartRow,
        Game.display.width - Game.squareDim,
        pauseBoxHeight
    );
    ctx.strokeRect(
        0.5 * Game.squareDim,
        pauseBoxStartRow,
        Game.display.width - Game.squareDim,
        pauseBoxHeight
    );

    ctx.fillStyle = Game.borderColor;
    ctx.font = fontHeight + Game.fontSuffix;
    for (var i = 0; i < pauseText.length; i++) {
        var thisText = pauseText[i];
        ctx.fillText(
            thisText,
            Game.squareDim,
            pauseBoxStartRow + 1.055 * fontHeight * (i+1),
            Game.display.width - 2 * Game.squareDim
        );
    }
};

Game.drawGrid = function(ctx, grid, squareDim) {
    ctx.lineWidth = Game.gridLineWidth;
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

Game.drawStatusBar = function(ctx) {
    ctx.fillStyle = Game.colors[Game.gridStates.EMPTY];
    ctx.fillRect(
        0,
        Game.display.height - Game.statusBarHeight,
        Game.display.width,
        Game.statusBarHeight
    );

    var scoreText = 'Lines completed: ' + Game.finishedRowCount;
    var fontHeight = 0.5 * Game.statusBarHeight;
    ctx.font = fontHeight + Game.fontSuffix;
    ctx.fillStyle = Game.borderColor;
    ctx.fillText(
        scoreText,
        (0.5 * Game.display.width) - (0.5 * ctx.measureText(scoreText).width),
        Game.display.height - (0.5 * Game.statusBarHeight) + (0.35 * fontHeight)
    );
};

Game.drawBorders = function(ctx) {
    ctx.strokeStyle = Game.borderColor;
    ctx.lineWidth = Game.borderLineWidth;
    ctx.strokeRect(0, 0, Game.display.width, Game.display.height);
    ctx.lineWidth = 0.5 * Game.borderLineWidth;
    ctx.beginPath();
    ctx.moveTo(0, Game.display.height - Game.statusBarHeight);
    ctx.lineTo(Game.display.width, Game.display.height - Game.statusBarHeight);
    ctx.closePath();
    ctx.stroke();
};

Game.draw = function(ctx, grid, squareDim) {
    Game.drawGrid(ctx, grid, squareDim);
    Game.drawStatusBar(ctx);
    Game.drawBorders(ctx);
};

Game.keyDownHandler = function(e) {
    if (e.keyCode === Game.keyCodes.LEFT_ARROW) {
        Game.keyPressed['left']['current'] = true;
    } else if (e.keyCode === Game.keyCodes.RIGHT_ARROW) {
        Game.keyPressed['right']['current'] = true;
    } else if (e.keyCode === Game.keyCodes.DOWN_ARROW) {
        Game.keyPressed['down']['current'] = true;
    } else if (e.keyCode === Game.keyCodes.C) {
        Game.keyPressed['clockwise']['current'] = true;
    } else if (e.keyCode === Game.keyCodes.Z) {
        Game.keyPressed['counterClockwise']['current'] = true;
    } else if (e.keyCode === Game.keyCodes.X) {
        Game.keyPressed['reflect']['current'] = true;
    } else if (e.keyCode === Game.keyCodes.SPACE) {
        Game.keyPressed['pause']['current'] = true;
    }
};

Game.keyUpHandler = function(e) {
    if (e.keyCode === Game.keyCodes.LEFT_ARROW) {
        Game.keyPressed['left']['current'] = false;
    } else if (e.keyCode === Game.keyCodes.RIGHT_ARROW) {
        Game.keyPressed['right']['current'] = false;
    } else if (e.keyCode === Game.keyCodes.DOWN_ARROW) {
        Game.keyPressed['down']['current'] = false;
    } else if (e.keyCode === Game.keyCodes.C) {
        Game.keyPressed['clockwise']['current'] = false;
    } else if (e.keyCode === Game.keyCodes.Z) {
        Game.keyPressed['counterClockwise']['current'] = false;
    } else if (e.keyCode === Game.keyCodes.X) {
        Game.keyPressed['reflect']['current'] = false;
    } else if (e.keyCode === Game.keyCodes.SPACE) {
        Game.keyPressed['pause']['current'] = false;
    }
};

Game.main = function(timeFrame) {
    var keepGoing = Game.update(Game.grid, timeFrame);
    if (Game.isPaused) {
        if (Game.isNewlyPaused) {
            Game.drawPauseScreen(Game.ctx, Game.controlsHelp);
            Game.isNewlyPaused = false;
        }
    } else {
        Game.draw(Game.ctx, Game.grid, Game.squareDim);
    }
    if (keepGoing) {
        window.requestAnimationFrame(Game.main);
    } else {
        console.log('game over!');
    }
};
