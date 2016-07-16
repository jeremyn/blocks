/* Copyright 2016, Jeremy Nation <jeremy@jeremynation.me>
 * Released under the GPLv3.
 */
'use strict';
var Game = {};

Game.run = function (canvasId, squareDim, statusBarHeight, borderLineWidth, gridLineWidth) {
    Game.c = Game.getConstants();

    document.addEventListener('keydown', Game.keyDownHandler, false);
    document.addEventListener('keyup', Game.keyUpHandler, false);

    Game.display = document.getElementById(canvasId);

    Game.ds = {
        borderLineWidth: borderLineWidth,
        displayHeight: Game.display.height,
        displayWidth: Game.display.width,
        gridLineWidth: gridLineWidth,
        squareDim: squareDim,
        statusBarHeight: statusBarHeight
    };

    // in milliseconds
    Game.downTickDuration = 500;

    Game.isGameOver = false;
    Game.isFirstRun = true;
    Game.isPaused = true;
    Game.shouldRedraw = false;
    Game.shouldResetLastDownTick = true;

    Game.prepareNewGame();

    Game.draw(
        Game.display.getContext('2d'),
        Game.grid,
        Game.ds,
        Game.c.colors,
        Game.c.FONT_SUFFIX,
        Game.getPauseScreenText(),
        Game.finishedRowCount
    );

    window.requestAnimationFrame(Game.main);
};

Game.getEmptyGrid = function(numRows, numCols, initialState) {
    var grid = [];
    for (var rowNum = 0; rowNum < numRows; rowNum++) {
        var row = [];
        for (var colNum = 0; colNum < numCols; colNum++) {
            row.push({
                state: initialState,
                isActive: false
            });
        }
        grid.push(row);
    }
    return grid;
};

Game.prepareNewGame = function() {
    Game.keyPressed.initialize();
    Game.finishedRowCount = 0;

    var numRows = (Game.ds.displayHeight - Game.ds.statusBarHeight) / Game.ds.squareDim;
    var numCols = Game.ds.displayWidth / Game.ds.squareDim;
    if ((numRows % 2 !== 0) || (numCols % 2 !== 0)) {
        throw new Error('bad grid dimensions');
    } else {
        Game.grid = Game.getEmptyGrid(numRows, numCols, Game.c.colors.EMPTY);
    }

    Game.grid = Game.addNewBlock(Game.grid, Game.c.ALL_BLOCKS).newGrid;
};

Game.addNewBlock = function(inputGrid, allBlocks) {
    var addBlockSuccessful = true;
    var outputGrid = Game.getGridCopy(inputGrid);

    var newBlock = allBlocks[Math.floor(Math.random() * allBlocks.length)];
    var startColNum = (outputGrid[0].length / 2) - Math.floor((newBlock[0].length / 2));
    for (var rowNum = 0; rowNum < newBlock.length; rowNum++) {
        for (var colNum = 0; colNum < newBlock[0].length; colNum++) {
            var gridCell = outputGrid[rowNum][startColNum + colNum];
            var blockCellState = newBlock[rowNum][colNum];
            if (blockCellState !== Game.c.colors.EMPTY) {
                if (gridCell['state'] === Game.c.colors.EMPTY) {
                    gridCell['state'] = blockCellState;
                    gridCell['isActive'] = true;
                } else {
                    addBlockSuccessful = false;
                    break;
                }
            }
        }
        if (!addBlockSuccessful) {
            break;
        }
    }

    return {
        addBlockSuccessful: addBlockSuccessful,
        newGrid: outputGrid
    };
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
                (grid[newCoord[0]][newCoord[1]]['state'] === Game.c.colors.EMPTY)
            )
        );
        if (!moveIsAllowed) {
            break;
        }
    }

    if (moveIsAllowed) {
        var state = grid[oldActiveCoords[0][0]][oldActiveCoords[0][1]]['state'];
        for (var i = 0; i < oldActiveCoords.length; i++) {
            grid[oldActiveCoords[i][0]][oldActiveCoords[i][1]]['state'] = Game.c.colors.EMPTY;
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
    if (action === Game.c.actions.CLOCKWISE) {
        newCoords = oldCoords;
        for (var j = 0; j < 3; j++) {
            newCoords = Game.getUpdatedCoords(newCoords, Game.c.actions.COUNTERCLOCKWISE);
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
            if (action === Game.c.actions.LEFT) {
                newRow = oldRow;
                newCol = oldCol-1;
            } else if (action === Game.c.actions.RIGHT) {
                newRow = oldRow;
                newCol = oldCol+1;
            } else if (action === Game.c.actions.DOWN) {
                newRow = oldRow+1;
                newCol = oldCol;
            } else if (action === Game.c.actions.COUNTERCLOCKWISE) {
                newRow = minRow+((maxCol-minCol)-(oldCol-minCol));
                newCol = minCol+(oldRow-minRow);

                // adjust behavior for straight-block
                if (new Set(rows).size === 1) {
                    newCol++;
                } else if (new Set(cols).size === 1) {
                    newCol--;
                }
            } else if (action === Game.c.actions.REFLECT) {
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
            return col['state'] === Game.c.colors.EMPTY;
        });
        if (emptyCols.length === 0) {
            finishedRowNums.push(rowNum);
        }
    }
    for (var i = 0; i < finishedRowNums.length; i++) {
        var finishedRowNum = finishedRowNums[i];
        for (var colNum = 0; colNum < grid[0].length; colNum++) {
            grid[finishedRowNum][colNum]['state'] = Game.c.colors.EMPTY;
        }
        for (rowNum = finishedRowNum-1; rowNum >= 0; rowNum--) {
            for (colNum = 0; colNum < grid[0].length; colNum++) {
                grid[rowNum+1][colNum]['state'] = grid[rowNum][colNum]['state'];
                grid[rowNum][colNum]['state'] = Game.c.colors.EMPTY;
            }
        }
        Game.finishedRowCount++;
    }
};

Game.processActionKeys = function(grid) {
    for (var i = 0; i < Game.c.ACTION_MAP.length; i++) {
        var keyCode = Game.c.ACTION_MAP[i][0];
        var action = Game.c.ACTION_MAP[i][1];
        if (Game.keyPressed.get(keyCode)['current'] &&
            !Game.keyPressed.get(keyCode)['previous']) {
            Game.moveActiveBlock(grid, action);
            break;
        }
    }

    for (var i = 0; i < Game.c.ACTION_MAP.length; i++) {
        Game.keyPressed.get(Game.c.ACTION_MAP[i][0])['previous'] = Game.keyPressed.get(Game.c.ACTION_MAP[i][0])['current'];
    }
};

Game.processDownwardTick = function(grid, timeFrame) {
    var keepGoing = true;
    if (timeFrame > (Game.lastDownTick + Game.downTickDuration)) {
        Game.lastDownTick = timeFrame;
        var moveWorked = Game.moveActiveBlock(grid, Game.c.actions.DOWN);

        if (!moveWorked) {
            for (var rowNum = 0; rowNum < grid.length; rowNum++) {
                for (var colNum = 0; colNum < grid[0].length; colNum++) {
                    grid[rowNum][colNum]['isActive'] = false;
                }
            }

            Game.clearMatchedRows(grid);

            var results = Game.addNewBlock(grid, Game.c.ALL_BLOCKS);
            Game.grid = results.newGrid;
            keepGoing = results.addBlockSuccessful;
        }
    }
    return keepGoing;
};

Game.processPauseKey = function(timeFrame) {
    if (Game.keyPressed.get(Game.c.keyCodes.SPACE)['current'] &&
        !Game.keyPressed.get(Game.c.keyCodes.SPACE)['previous']) {
        if (Game.isPaused) {
            Game.isPaused = false;
            Game.isFirstRun = false;
            Game.shouldRedraw = true;
            if (Game.shouldResetLastDownTick) {
                Game.lastDownTick = timeFrame;
                Game.shouldResetLastDownTick = false;
            }
        } else {
            Game.isPaused = true;
        }
    }
    Game.keyPressed.get(Game.c.keyCodes.SPACE)['previous'] = Game.keyPressed.get(Game.c.keyCodes.SPACE)['current'];
};

Game.update = function(grid, timeFrame) {
    var isGameOver = Game.isGameOver;
    Game.processPauseKey(timeFrame);
    if (!Game.isPaused) {
        if (isGameOver) {
            Game.prepareNewGame();
            isGameOver = false;
        } else {
            Game.processActionKeys(grid);
            isGameOver = !Game.processDownwardTick(grid, timeFrame);
        }
    }
    return isGameOver;
};

Game.drawPauseScreen = function(ctx, ds, colors, fontSuffix, pauseScreenText) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.0)";
    ctx.fillRect(0, 0, ds.displayWidth, ds.displayHeight - ds.statusBarHeight);
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, ds.displayWidth, ds.displayHeight - ds.statusBarHeight);

    var fontHeight = 0.5 * ds.statusBarHeight;
    var pauseBoxHeight = 1.05 * fontHeight * (pauseScreenText.length + 0.5);
    var pauseBoxStartRow = 0.5 * (ds.displayHeight - ds.statusBarHeight - pauseBoxHeight);

    ctx.fillStyle = colors.EMPTY;
    ctx.strokeStyle = colors.BORDER;
    ctx.fillRect(
        0.5 * ds.squareDim,
        pauseBoxStartRow,
        ds.displayWidth - ds.squareDim,
        pauseBoxHeight
    );
    ctx.strokeRect(
        0.5 * ds.squareDim,
        pauseBoxStartRow,
        ds.displayWidth - ds.squareDim,
        pauseBoxHeight
    );

    ctx.fillStyle = colors.BORDER;
    ctx.font = fontHeight + fontSuffix;
    for (var i = 0; i < pauseScreenText.length; i++) {
        var thisText = pauseScreenText[i];
        ctx.fillText(
            thisText,
            ds.squareDim,
            pauseBoxStartRow + 1.055 * fontHeight * (i+1),
            ds.displayWidth - 2 * ds.squareDim
        );
    }
};

Game.drawGrid = function(ctx, grid, ds, colors) {
    ctx.lineWidth = ds.gridLineWidth;
    ctx.strokeStyle = colors.BORDER;
    for (var rowNum = 0; rowNum < grid.length; rowNum++) {
        for (var colNum = 0; colNum < grid[0].length; colNum++) {
            ctx.fillStyle = grid[rowNum][colNum]['state'];
            ctx.fillRect(
                colNum * ds.squareDim,
                rowNum * ds.squareDim,
                ds.squareDim,
                ds.squareDim
            );
            ctx.strokeRect(
                colNum * ds.squareDim,
                rowNum * ds.squareDim,
                ds.squareDim,
                ds.squareDim
            );
        }
    }
};

Game.drawStatusBar = function(ctx, ds, colors, fontSuffix, finishedRowCount) {
    ctx.fillStyle = colors.EMPTY;
    ctx.fillRect(
        0,
        ds.displayHeight - ds.statusBarHeight,
        ds.displayWidth,
        ds.statusBarHeight
    );

    var scoreText = 'Lines completed: ' + finishedRowCount;
    var fontHeight = 0.5 * ds.statusBarHeight;
    ctx.font = fontHeight + fontSuffix;
    ctx.fillStyle = colors.BORDER;
    ctx.fillText(
        scoreText,
        (0.5 * ds.displayWidth) - (0.5 * ctx.measureText(scoreText).width),
        ds.displayHeight - (0.5 * ds.statusBarHeight) + (0.35 * fontHeight)
    );
};

Game.drawBorders = function(ctx, ds, colors) {
    ctx.strokeStyle = colors.BORDER;
    ctx.lineWidth = ds.borderLineWidth;
    ctx.strokeRect(0, 0, ds.displayWidth, ds.displayHeight);
    ctx.lineWidth = 0.5 * ds.borderLineWidth;
    ctx.beginPath();
    ctx.moveTo(0, ds.displayHeight - ds.statusBarHeight);
    ctx.lineTo(ds.displayWidth, ds.displayHeight - ds.statusBarHeight);
    ctx.closePath();
    ctx.stroke();
};

Game.draw = function(ctx, grid, ds, colors, fontSuffix, pauseScreenText, finishedRowCount) {
    Game.drawGrid(ctx, grid, ds, colors);
    Game.drawStatusBar(ctx, ds, colors, fontSuffix, finishedRowCount);
    Game.drawBorders(ctx, ds, colors);
    if (Game.isPaused) {
        Game.drawPauseScreen(ctx, ds, colors, fontSuffix, pauseScreenText);
        Game.shouldRedraw = false;
    }
};

Game.keyDownHandler = function(e) {
    Game.keyPressed.get(e.keyCode)['current'] = true;
};

Game.keyUpHandler = function(e) {
    Game.keyPressed.get(e.keyCode)['current'] = false;
};

Game.getPauseScreenText = function() {
    var pauseHeaderText;
    if (Game.isFirstRun) {
        pauseHeaderText = [
            "Welcome to Blocks!",
            "Press \<space\> to unpause and begin.",
            ""
        ];
    } else if (Game.isGameOver) {
        pauseHeaderText = [
            "Game over!",
            "Press \<space\> to play again.",
            ""
        ];
    } else {
        pauseHeaderText = [
            "Paused!",
            ""
        ];
    }
    return pauseHeaderText.concat(Game.c.CONTROLS_TEXT);
};

Game.main = function(timeFrame) {
    Game.isGameOver = Game.update(Game.grid, timeFrame);
    if (Game.isGameOver) {
        Game.isPaused = true;
        Game.shouldResetLastDownTick = true;
    }
    if (Game.shouldRedraw) {
        Game.draw(
            Game.display.getContext('2d'),
            Game.grid,
            Game.ds,
            Game.c.colors,
            Game.c.FONT_SUFFIX,
            Game.getPauseScreenText(),
            Game.finishedRowCount
        );
    }
    window.requestAnimationFrame(Game.main);
};

Game.getConstants = function() {
    var c = {};

    c.keyCodes = {
        SPACE: 32,
        LEFT_ARROW: 37,
        RIGHT_ARROW: 39,
        DOWN_ARROW: 40,
        C: 67,
        X: 88,
        Z: 90
    };

    c.CONTROLS_TEXT = [
        "-Controls-",
        "Pause/unpause: \<space\>",
        "Move block: left/right/down arrow",
        "Rotate counterclockwise: 'z'",
        "Reflect around y-axis: 'x'",
        "Rotate clockwise: 'c'"
    ];

    c.actions = {
        DOWN: 'down',
        LEFT: 'left',
        RIGHT: 'right',
        CLOCKWISE: 'clockwise',
        COUNTERCLOCKWISE: 'counterclockwise',
        REFLECT: 'reflect',  // reflect around y-axis
        PAUSE: 'pause'
    };

    c.ACTION_MAP = [
        [c.keyCodes.LEFT_ARROW, c.actions.LEFT],
        [c.keyCodes.RIGHT_ARROW, c.actions.RIGHT],
        [c.keyCodes.DOWN_ARROW, c.actions.DOWN],
        [c.keyCodes.C, c.actions.CLOCKWISE],
        [c.keyCodes.Z, c.actions.COUNTERCLOCKWISE],
        [c.keyCodes.X, c.actions.REFLECT]
    ];

    c.colors = {
        BORDER: 'black',
        EMPTY: 'white',
        L: 'silver',
        SQUARE: 'red',
        STRAIGHT: 'fuchsia',
        T: 'lime',
        Z: 'aqua'
    };

    c.ALL_BLOCKS = [
        [
            [c.colors.L, c.colors.L, c.colors.L],
            [c.colors.L, c.colors.EMPTY, c.colors.EMPTY]
        ],
        [
            [c.colors.SQUARE, c.colors.SQUARE],
            [c.colors.SQUARE, c.colors.SQUARE]
        ],
        [
            [c.colors.STRAIGHT, c.colors.STRAIGHT, c.colors.STRAIGHT, c.colors.STRAIGHT]
        ],
        [
            [c.colors.T, c.colors.T, c.colors.T],
            [c.colors.EMPTY, c.colors.T, c.colors.EMPTY]
        ],
        [
            [c.colors.Z, c.colors.Z, c.colors.EMPTY],
            [c.colors.EMPTY, c.colors.Z, c.colors.Z]
        ]
    ];

    c.FONT_SUFFIX = 'px serif';

    return c;
};

Game.keyPressed = {};

Game.keyPressed.initialize = function() {
    this.values = {};
};

Game.keyPressed.get = function(keyCode) {
    if (!this.values.hasOwnProperty(keyCode)) {
        this.values[keyCode] = {
            'previous': false,
            'current': false
        };
    }
    return this.values[keyCode];
};

Game.getGridCopy = function(inputGrid) {
    var outputGrid = [];
    for (var rowNum = 0; rowNum < inputGrid.length; rowNum++) {
        var outputRow = [];
        for (var colNum = 0; colNum < inputGrid[rowNum].length; colNum++) {
            outputRow.push({
                state: inputGrid[rowNum][colNum]['state'],
                isActive: inputGrid[rowNum][colNum]['isActive']
            });
        }
        outputGrid.push(outputRow);
    }
    return outputGrid;
};
