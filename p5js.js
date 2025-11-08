let gridSize = 32;
let cellSize;
let wraparoundEnabled = true;
let gridLeft, gridRight;
let nextGridLeft, nextGridRight;
let lifetimeLeft, lifetimeRight;

let isRunning = false;
let playButton, stepButton, resetButton;
let speedSlider, speedValue;

let probUnderpopulation = 1.0;
let probSurvival = 1.0;
let probOverpopulation = 1.0;
let probReproduction = 1.0;

let lastUpdateTime = 0;
let updateInterval = 100;

let gap = 10; // Gap between grids

function setup() {
    const canvas = createCanvas(800, 400); // Total canvas width
    canvas.parent('canvas-container');

    cellSize = (width - gap) / 2 / gridSize;

    gridLeft = create2DArray(gridSize);
    gridRight = create2DArray(gridSize);
    nextGridLeft = create2DArray(gridSize);
    nextGridRight = create2DArray(gridSize);
    lifetimeLeft = create2DArray(gridSize);
    lifetimeRight = create2DArray(gridSize);

    randomizeGrid(gridLeft);
    //randomizeGrid(gridRight);
    gridRight = gridLeft.map(row => row.slice());

    playButton = select('#playButton');
    playButton.mousePressed(togglePlay);

    stepButton = select('#stepButton');
    stepButton.mousePressed(stepSimulation);

    resetButton = select('#resetButton');
    resetButton.mousePressed(resetGrid);

    wrapToggleButton = select('#wrapToggleButton');
    wrapToggleButton.mousePressed(toggleWraparound);

    speedSlider = select('#speedSlider');
    speedValue = select('#speedValue');
    speedSlider.input(updateSpeed);

    underPopulationSlider = select('#underpopulationSlider');
    underPopulationSlider.input(() => updateVar(underPopulationSlider, 'underpopulation'));

    survivalSlider = select('#survivalSlider');
    survivalSlider.input(() => updateVar(survivalSlider, 'survival'));

    overPopulationSlider = select('#overpopulationSlider');
    overPopulationSlider.input(() => updateVar(overPopulationSlider, 'overpopulation'));

    reproductionSlider = select('#reproductionSlider');
    reproductionSlider.input(() => updateVar(reproductionSlider, 'reproduction'));

    updateSpeed();
}

function draw() {
    background(220);
    drawGrid(gridLeft, 0); // Left grid
    drawGrid(gridRight, width / 2 + gap); // Right grid with gap

    if (isRunning) {
        let currentTime = millis();
        if (currentTime - lastUpdateTime > updateInterval) {
            computeNextGeneration(gridLeft, nextGridLeft, 1.0, 1.0, 1.0, 1.0);
            computeNextGeneration(gridRight, nextGridRight, probUnderpopulation, probSurvival, probOverpopulation, probReproduction);
            swapGrids();
            lastUpdateTime = currentTime;

            // Check if both grids are empty
            if (isGridEmpty(gridLeft) && isGridEmpty(gridRight)) {
                isRunning = false;
                playButton.html('Play');
                console.log("Simulation stopped: both grids are empty.");
            }
        }
    }
}

function isGridEmpty(grid) {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[i][j] !== 0) {
                return false;
            }
        }
    }
    return true;
}

function toggleWraparound() {
    wraparoundEnabled = !wraparoundEnabled;
    wrapToggleButton.html(`Wraparound: ${wraparoundEnabled ? 'On' : 'Off'}`);
}

function updateSpeed() {
    let sliderValue = parseInt(speedSlider.value());
    updateInterval = map(sliderValue, 1, 60, 1000, 16);
    speedValue.html(sliderValue);
}

function updateVar(slider, variableName) {
    let value = parseFloat(slider.value());
    switch (variableName) {
        case 'underpopulation':
            probUnderpopulation = value;
            break;
        case 'survival':
            probSurvival = value;
            break;
        case 'overpopulation':
            probOverpopulation = value;
            break;
        case 'reproduction':
            probReproduction = value;
            break;
    }
    document.getElementById(`${variableName}Value`).textContent = Math.round(document.getElementById(`${variableName}Slider`).value * 100);

}

function togglePlay() {
    isRunning = !isRunning;
    playButton.html(isRunning ? 'Pause' : 'Play');
    lastUpdateTime = millis();
}

function stepSimulation() {
    if (!isRunning) {
        computeNextGeneration(gridLeft, nextGridLeft, 1.0, 1.0, 1.0, 1.0);
        computeNextGeneration(gridRight, nextGridRight, probUnderpopulation, probSurvival, probOverpopulation, probReproduction);
        swapGrids();
    }
}

function resetGrid() {
    isRunning = false;
    playButton.html('Play');
    randomizeGrid(gridLeft);
    //randomizeGrid(gridRight);
    gridRight = gridLeft.map(row => row.slice());
}

function mousePressed() {
    let i = floor(mouseY / cellSize);
    let j;
    let gridTarget;
    let gridOther;

    if (mouseX < width / 2) {
        j = floor(mouseX / cellSize);
        gridTarget = gridLeft;
        gridOther = gridRight;
    } else {
        j = floor((mouseX - width / 2 - gap) / cellSize);
        gridTarget = gridRight;
        gridOther = gridLeft;
    }

    if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
        gridTarget[i][j] = gridTarget[i][j] === 1 ? 0 : 1;
        gridOther[i][j] = gridOther[i][j] === 1 ? 0 : 1;
        //gridOther = gridTarget.map(row => row.slice());
    }
}

function create2DArray(size) {
    let arr = new Array(size);
    for (let i = 0; i < size; i++) {
        arr[i] = new Array(size).fill(0);
    }
    return arr;
}

function randomizeGrid(grid) {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = random() < 0.5 ? 1 : 0;
        }
    }
}

function drawGrid(grid, offsetX) {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            fill(grid[i][j] === 1 ? 'black' : 'white');
            stroke(200);
            rect(offsetX + j * cellSize, i * cellSize, cellSize, cellSize);
        }
    }
}

function computeNextGeneration(current, next, pUnder, pSurvive, pOver, pReproduce) {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            let neighbors = countLiveNeighbors(current, i, j);
            let cell = current[i][j];

            if (cell === 1) {
                if (neighbors < 2 && random() <= pUnder) {
                    next[i][j] = 0;
                } else if ((neighbors === 2 || neighbors === 3)) {
                    if (random() <= pSurvive) {
                        next[i][j] = 1;
                    }
                    else {
                        next[i][j] = 0;
                    }
                    
                } else if (neighbors > 3 && random() <= pOver) {
                    next[i][j] = 0;
                } else {
                    next[i][j] = cell;
                }
            } else {
                if (neighbors === 3 && random() <= pReproduce) {
                    next[i][j] = 1;
                } else {
                    next[i][j] = cell;
                }
            }
        }
    }
}

function countLiveNeighbors(grid, x, y) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;

            let ni = x + i;
            let nj = y + j;

            if (wraparoundEnabled) {
                ni = (ni + gridSize) % gridSize;
                nj = (nj + gridSize) % gridSize;
                count += grid[ni][nj];
            } else {
                if (ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize) {
                    count += grid[ni][nj];
                }
            }
        }
    }
    return count;
}

function swapGrids() {
    [gridLeft, nextGridLeft] = [nextGridLeft, gridLeft];
    [gridRight, nextGridRight] = [nextGridRight, gridRight];
}