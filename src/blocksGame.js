/* Copyright 2016, Jeremy Nation <jeremy@jeremynation.me>
 * Released under the GPLv3.
 */
'use strict';
var blocksGame = {};
blocksGame.KeyPressedClass = function() {};

blocksGame.run = function (
        canvasId, squareDim, statusBarHeight, borderLineWidth, gridLineWidth) {
    this.display = document.getElementById(canvasId);

    var ds = {
        borderLineWidth: borderLineWidth,
        displayHeight: this.display.height,
        displayWidth: this.display.width,
        gridLineWidth: gridLineWidth,
        squareDim: squareDim,
        statusBarHeight: statusBarHeight
    };

    this.c = this.getConstants(ds);

    this.status = {
        isGameOver: false,
        isFirstRun: true,
        isPaused: true,
        shouldRedraw: false,
        shouldResetLastDownTick: true,
        finishedRowCount: 0,
        lastDownTick: null,
        timeFrame: null
    };

    this.grid = this.addNewBlock(this.c, this.getEmptyGrid(this.c)).grid;

    this.status = this.draw(
        this.c,
        this.status,
        this.grid,
        this.display.getContext('2d'),
        this.getPauseScreenText(this.status, this.c.CONTROLS_TEXT)
    ).status;

    this.keyPressed = new this.KeyPressedClass();
    this.keyPressed.initialize();
    document.addEventListener('keydown', this.keyPressed, false);
    document.addEventListener('keyup', this.keyPressed, false);

    window.requestAnimationFrame(this.main.bind(this));
};

blocksGame.getEmptyGrid = function(c) {
    var numRows = (c.ds.displayHeight - c.ds.statusBarHeight) / c.ds.squareDim;
    var numCols = c.ds.displayWidth / c.ds.squareDim;
    if ((numRows % 2 !== 0) || (numCols % 2 !== 0)) {
        throw new Error('bad grid dimensions');
    }

    var grid = [];
    for (var rowNum = 0; rowNum < numRows; rowNum++) {
        var row = [];
        for (var colNum = 0; colNum < numCols; colNum++) {
            row.push({
                state: c.colors.EMPTY,
                isActive: false
            });
        }
        grid.push(row);
    }
    return grid;
};

blocksGame.addNewBlock = function(c, grid_) {
    var grid = this.getGridCopy(grid_);
    var addBlockSuccessful = true;
    var newBlock = c.ALL_BLOCKS[
        Math.floor(Math.random() * c.ALL_BLOCKS.length)
    ];
    var startColNum = (
        (grid[0].length / 2) - Math.floor(newBlock[0].length / 2)
    );
    for (var rowNum = 0; rowNum < newBlock.length; rowNum++) {
        for (var colNum = 0; colNum < newBlock[0].length; colNum++) {
            var gridCell = grid[rowNum][startColNum + colNum];
            var blockCellState = newBlock[rowNum][colNum];
            if (blockCellState !== c.colors.EMPTY) {
                if (gridCell.state === c.colors.EMPTY) {
                    gridCell.state = blockCellState;
                    gridCell.isActive = true;
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
        grid: grid
    };
};

blocksGame.getActiveBlockCoords = function(grid) {
    var activeBlockCoords = [];
    for (var rowNum = 0; rowNum < grid.length; rowNum++) {
        for (var colNum = 0; colNum < grid[0].length; colNum++) {
            if (grid[rowNum][colNum].isActive) {
                activeBlockCoords.push([rowNum, colNum]);
            }
        }
    }
    return activeBlockCoords;
};

blocksGame.updateActiveBlockPosition = function(
        c, grid_, oldActiveCoords, newActiveCoords) {
    var grid = this.getGridCopy(grid_);
    var moveIsAllowed = true;
    var i;
    for (i = 0; i < newActiveCoords.length; i++) {
        var newCoord = newActiveCoords[i];
        moveIsAllowed = (
            (0 <= newCoord[0]) && (newCoord[0] < grid.length) &&
            (0 <= newCoord[1]) && (newCoord[1] < grid[0].length) &&
            (
                (grid[newCoord[0]][newCoord[1]].isActive === true) ||
                (grid[newCoord[0]][newCoord[1]].state === c.colors.EMPTY)
            )
        );
        if (!moveIsAllowed) {
            break;
        }
    }

    if (moveIsAllowed) {
        var gridCell = grid[oldActiveCoords[0][0]][oldActiveCoords[0][1]];
        var state = gridCell.state;
        for (i = 0; i < oldActiveCoords.length; i++) {
            gridCell = grid[oldActiveCoords[i][0]][oldActiveCoords[i][1]];
            gridCell.state = c.colors.EMPTY;
            gridCell.isActive = false;
        }
        for (i = 0; i < newActiveCoords.length; i++) {
            gridCell = grid[newActiveCoords[i][0]][newActiveCoords[i][1]];
            gridCell.state = state;
            gridCell.isActive = true;
        }
    }
    return {
        moveIsAllowed: moveIsAllowed,
        grid: grid
    };
};

blocksGame.getUpdatedCoords = function(c, oldCoords, action) {
    var newCoords;
    if (action === c.actions.CLOCKWISE) {
        newCoords = oldCoords;
        for (var j = 0; j < 3; j++) {
            newCoords = this.getUpdatedCoords(
                c,
                newCoords,
                c.actions.COUNTERCLOCKWISE
            );
        }
    } else {
        var rows = oldCoords.map(function(c) { return c[0]; });
        rows.sort(function(a,b){ return a-b; });
        var minRow = rows[0];
        var maxRow = rows[rows.length-1];

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
            if (action === c.actions.LEFT) {
                newRow = oldRow;
                newCol = oldCol-1;
            } else if (action === c.actions.RIGHT) {
                newRow = oldRow;
                newCol = oldCol+1;
            } else if (action === c.actions.DOWN) {
                newRow = oldRow+1;
                newCol = oldCol;
            } else if (action === c.actions.COUNTERCLOCKWISE) {
                newRow = minRow+((maxCol-minCol)-(oldCol-minCol));
                newCol = minCol+(oldRow-minRow);

                // adjust behavior for straight-block
                if (minRow === maxRow) {
                    newCol++;
                } else if (minCol === maxCol) {
                    newCol--;
                }
            } else if (action === c.actions.REFLECT) {
                newRow = oldRow;
                newCol = maxCol - oldCol + minCol;
            }
            newCoords.push([newRow, newCol]);
        }
    }
    return newCoords;
};

blocksGame.moveActiveBlock = function(c, grid, action) {
    var oldActiveCoords = this.getActiveBlockCoords(grid);
    var newActiveCoords = this.getUpdatedCoords(c, oldActiveCoords, action);
    var results = this.updateActiveBlockPosition(
        c,
        grid,
        oldActiveCoords,
        newActiveCoords
    );
    return {
        moveIsAllowed: results.moveIsAllowed,
        grid: results.grid
    };
};

blocksGame.clearMatchedRows = function(c, status_, grid_) {
    var status = this.getStatusCopy(status_);
    var grid = this.getGridCopy(grid_);
    var finishedRowNums = [];
    var colNum;
    for (var rowNum = 0; rowNum < grid.length; rowNum++) {
        var emptyCols = [];
        for (colNum = 0; colNum < grid[rowNum].length; colNum++) {
            if (grid[rowNum][colNum].state === c.colors.EMPTY) {
                emptyCols.push(colNum);
            }
        }
        if (emptyCols.length === 0) {
            finishedRowNums.push(rowNum);
        }
    }
    for (var i = 0; i < finishedRowNums.length; i++) {
        var finishedRowNum = finishedRowNums[i];
        for (colNum = 0; colNum < grid[0].length; colNum++) {
            grid[finishedRowNum][colNum].state = c.colors.EMPTY;
        }
        for (rowNum = finishedRowNum-1; rowNum >= 0; rowNum--) {
            for (colNum = 0; colNum < grid[0].length; colNum++) {
                grid[rowNum+1][colNum].state = grid[rowNum][colNum].state;
                grid[rowNum][colNum].state = c.colors.EMPTY;
            }
        }
    }

    status.finishedRowCount += finishedRowNums.length;
    return {
        status: status,
        grid: grid
    };
};

blocksGame.processActionKeys = function(c, grid_, keyPressed) {
    var grid = this.getGridCopy(grid_);
    for (var i = 0; i < c.ACTION_MAP.length; i++) {
        var keyCode = c.ACTION_MAP[i][0];
        var action = c.ACTION_MAP[i][1];
        if (keyPressed.isNewlyPressed(keyCode)) {
            grid = this.moveActiveBlock(c, grid, action).grid;
            break;
        }
    }
    return {
        grid: grid
    };
};

blocksGame.processDownTick = function(c, status_, grid_) {
    var status = this.getStatusCopy(status_);
    var grid = this.getGridCopy(grid_);
    var keepGoing = true;

    var moveActiveBlockResults = this.moveActiveBlock(
        c,
        grid,
        c.actions.DOWN
    );
    var moveWorked = moveActiveBlockResults.moveIsAllowed;
    grid = moveActiveBlockResults.grid;

    if (!moveWorked) {
        for (var rowNum = 0; rowNum < grid.length; rowNum++) {
            for (var colNum = 0; colNum < grid[0].length; colNum++) {
                grid[rowNum][colNum].isActive = false;
            }
        }

        var clearMatchedRowsResults = this.clearMatchedRows(
            c,
            status,
            grid
        );
        status = clearMatchedRowsResults.status;
        grid = clearMatchedRowsResults.grid;

        var addNewBlockResults = this.addNewBlock(c, grid);
        grid = addNewBlockResults.grid;
        keepGoing = addNewBlockResults.addBlockSuccessful;
    }
    status.isGameOver = !keepGoing;
    return {
        status: status,
        grid: grid
    };
};

blocksGame.processPauseKey = function(c, status_, keyPressed) {
    var status = this.getStatusCopy(status_);
    var newDownTick = status.lastDownTick;
    if (keyPressed.isNewlyPressed(c.keyCodes.SPACE)) {
        if (status.isPaused) {
            status.isPaused = false;
            status.isFirstRun = false;
            status.shouldRedraw = true;
            if (status.shouldResetLastDownTick) {
                newDownTick = status.timeFrame;
                status.shouldResetLastDownTick = false;
            }
        } else {
            status.isPaused = true;
        }
    }

    status.lastDownTick = newDownTick;
    return {
        status: status
    };
};

blocksGame.update = function(c, status_, grid_, keyPressed) {
    var status = this.getStatusCopy(status_);
    var grid = this.getGridCopy(grid_);
    var processPauseKeyResults = this.processPauseKey(c, status, keyPressed);
    status = processPauseKeyResults.status;
    if (!status.isPaused) {
        if (status.isGameOver) {
            status.finishedRowCount = 0;
            status.isGameOver = false;
            grid = this.addNewBlock(c, this.getEmptyGrid(c)).grid;
        } else {
            var processActionKeysResults = this.processActionKeys(
                c,
                grid,
                keyPressed
            );
            grid = processActionKeysResults.grid;

            if (status.timeFrame >
                (status.lastDownTick + c.DOWN_TICK_DURATION)) {
                status.lastDownTick = status.timeFrame;
                var processDownTickResults = this.processDownTick(
                    c,
                    status,
                    grid
                );
                status = processDownTickResults.status;
                grid = processDownTickResults.grid;
            }
        }
    }
    return {
        status: status,
        grid: grid
    };
};

blocksGame.drawPauseScreen = function(c, ctx, pauseScreenText) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.0)";
    ctx.fillRect(
        0,
        0,
        c.ds.displayWidth,
        c.ds.displayHeight - c.ds.statusBarHeight
    );
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(
        0,
        0,
        c.ds.displayWidth,
        c.ds.displayHeight - c.ds.statusBarHeight
    );

    var fontHeight = 0.5 * c.ds.statusBarHeight;
    var pauseBoxHeight = 1.05 * fontHeight * (pauseScreenText.length + 0.5);
    var pauseBoxStartRow = (
        0.5 * (c.ds.displayHeight - c.ds.statusBarHeight - pauseBoxHeight)
    );

    ctx.fillStyle = c.colors.EMPTY;
    ctx.strokeStyle = c.colors.BORDER;
    ctx.fillRect(
        0.5 * c.ds.squareDim,
        pauseBoxStartRow,
        c.ds.displayWidth - c.ds.squareDim,
        pauseBoxHeight
    );
    ctx.strokeRect(
        0.5 * c.ds.squareDim,
        pauseBoxStartRow,
        c.ds.displayWidth - c.ds.squareDim,
        pauseBoxHeight
    );

    ctx.fillStyle = c.colors.BORDER;
    ctx.font = fontHeight + c.FONT_SUFFIX;
    for (var i = 0; i < pauseScreenText.length; i++) {
        var thisText = pauseScreenText[i];
        ctx.fillText(
            thisText,
            c.ds.squareDim,
            pauseBoxStartRow + 1.055 * fontHeight * (i+1),
            c.ds.displayWidth - 2 * c.ds.squareDim
        );
    }
};

blocksGame.drawGrid = function(c, grid, ctx) {
    ctx.lineWidth = c.ds.gridLineWidth;
    ctx.strokeStyle = c.colors.BORDER;
    var rowNum;
    var colNum;
    for (rowNum = 0; rowNum < grid.length; rowNum++) {
        for (colNum = 0; colNum < grid[0].length; colNum++) {
            ctx.fillStyle = grid[rowNum][colNum].state;
            ctx.fillRect(
                colNum * c.ds.squareDim,
                rowNum * c.ds.squareDim,
                c.ds.squareDim,
                c.ds.squareDim
            );
        }
    }
    // The borders look better if they are drawn after all cells are filled.
    for (rowNum = 0; rowNum < grid.length; rowNum++) {
        for (colNum = 0; colNum < grid[0].length; colNum++) {
            if (grid[rowNum][colNum].state !== c.colors.EMPTY) {
                ctx.strokeRect(
                    colNum * c.ds.squareDim,
                    rowNum * c.ds.squareDim,
                    c.ds.squareDim,
                    c.ds.squareDim
                );
            }
        }
    }
};

blocksGame.drawStatusBar = function(c, status, ctx) {
    ctx.fillStyle = c.colors.EMPTY;
    ctx.fillRect(
        0,
        c.ds.displayHeight - c.ds.statusBarHeight,
        c.ds.displayWidth,
        c.ds.statusBarHeight
    );

    var scoreText = 'Lines completed: ' + status.finishedRowCount;
    var fontHeight = 0.5 * c.ds.statusBarHeight;
    ctx.font = fontHeight + c.FONT_SUFFIX;
    ctx.fillStyle = c.colors.BORDER;
    ctx.fillText(
        scoreText,
        (0.5 * c.ds.displayWidth) - (0.5 * ctx.measureText(scoreText).width),
        c.ds.displayHeight - (0.5 * c.ds.statusBarHeight) + (0.35 * fontHeight)
    );
};

blocksGame.drawBorders = function(c, ctx) {
    ctx.strokeStyle = c.colors.BORDER;
    ctx.lineWidth = c.ds.borderLineWidth;
    ctx.strokeRect(0, 0, c.ds.displayWidth, c.ds.displayHeight);
    ctx.lineWidth = 0.5 * c.ds.borderLineWidth;
    ctx.beginPath();
    ctx.moveTo(0, c.ds.displayHeight - c.ds.statusBarHeight);
    ctx.lineTo(c.ds.displayWidth, c.ds.displayHeight - c.ds.statusBarHeight);
    ctx.closePath();
    ctx.stroke();
};

blocksGame.draw = function (c, status_, grid, ctx, pauseScreenText) {
    var status = this.getStatusCopy(status_);
    this.drawGrid(c, grid, ctx);
    this.drawStatusBar(c, status, ctx);
    this.drawBorders(c, ctx);
    if (status.isPaused) {
        this.drawPauseScreen(c, ctx, pauseScreenText);
        status.shouldRedraw = false;
    }
    return {
        status: status
    };
};

blocksGame.getPauseScreenText = function(status, controlsText) {
    var pauseHeaderText;
    if (status.isFirstRun) {
        pauseHeaderText = [
            "Welcome to Blocks!",
            "Press \<space\> to unpause and begin.",
            ""
        ];
    } else if (status.isGameOver) {
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
    return pauseHeaderText.concat(controlsText);
};

blocksGame.main = function(timeFrame) {
    this.status.timeFrame = timeFrame;
    var updateResults = this.update(
        this.c,
        this.status,
        this.grid,
        this.keyPressed
    );
    this.status = updateResults.status;
    this.grid = updateResults.grid;
    if (this.status.isGameOver) {
        this.keyPressed.initialize();
        this.status.isPaused = true;
        this.status.shouldResetLastDownTick = true;
    }
    if (this.status.shouldRedraw) {
        this.status = this.draw(
            this.c,
            this.status,
            this.grid,
            this.display.getContext('2d'),
            this.getPauseScreenText(this.status, this.c.CONTROLS_TEXT)
        ).status;
    }
    this.keyPressed.moveCurrToPrev();
    window.requestAnimationFrame(this.main.bind(this));
};

blocksGame.getConstants = function(ds) {
    var c = {};

    c.ds = ds;

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
        I: 'fuchsia',
        L: 'silver',
        O: 'red',
        T: 'lime',
        Z: 'aqua'
    };

    c.ALL_BLOCKS = [
        [
            [c.colors.I, c.colors.I, c.colors.I, c.colors.I]
        ],
        [
            [c.colors.L, c.colors.L, c.colors.L],
            [c.colors.L, c.colors.EMPTY, c.colors.EMPTY]
        ],
        [
            [c.colors.O, c.colors.O],
            [c.colors.O, c.colors.O]
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

    // in milliseconds
    c.DOWN_TICK_DURATION = 500;

    return c;
};

blocksGame.getGridCopy = function(gridOriginal) {
    var gridCopy = [];
    for (var rowNum = 0; rowNum < gridOriginal.length; rowNum++) {
        var outputRow = [];
        for (var colNum = 0; colNum < gridOriginal[rowNum].length; colNum++) {
            outputRow.push({
                state: gridOriginal[rowNum][colNum].state,
                isActive: gridOriginal[rowNum][colNum].isActive
            });
        }
        gridCopy.push(outputRow);
    }
    return gridCopy;
};

blocksGame.getStatusCopy = function(status) {
    return {
        isGameOver: status.isGameOver,
        isFirstRun: status.isFirstRun,
        isPaused: status.isPaused,
        shouldRedraw: status.shouldRedraw,
        shouldResetLastDownTick: status.shouldResetLastDownTick,
        finishedRowCount: status.finishedRowCount,
        lastDownTick: status.lastDownTick,
        timeFrame: status.timeFrame
    };
};

blocksGame.KeyPressedClass.prototype._initializeKeyCode = function(keyCode) {
    this.values[keyCode] = {
        'previous': false,
        'current': false
    };
};

blocksGame.KeyPressedClass.prototype._get = function(keyCode, which) {
    if (!(keyCode in this.values)) {
        this._initializeKeyCode(keyCode);
    }
    return this.values[keyCode][which];
};

blocksGame.KeyPressedClass.prototype._set = function(keyCode, which, value) {
    if (!(keyCode in this.values)) {
        this._initializeKeyCode(keyCode);
    }
    this.values[keyCode][which] = value;
};

blocksGame.KeyPressedClass.prototype.initialize = function() {
    this.values = {};
};

// This function is used implicitly with document.addEventListener.
blocksGame.KeyPressedClass.prototype.handleEvent = function(e) {
    switch(e.type) {
        case 'keydown':
            this._set(e.keyCode, 'current', true);
            break;
        case 'keyup':
            this._set(e.keyCode, 'current', false);
            break;
    }
};

blocksGame.KeyPressedClass.prototype.isNewlyPressed = function(keyCode) {
    return this._get(keyCode, 'current') && !this._get(keyCode, 'previous');
};

blocksGame.KeyPressedClass.prototype.moveCurrToPrev = function() {
    for (var keyCode in this.values) {
        if (this.values.hasOwnProperty(keyCode)) {
            this.values[keyCode].previous = this.values[keyCode].current;
        }
    }
};
