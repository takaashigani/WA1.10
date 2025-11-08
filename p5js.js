let gridSize = 8;
let cellSize;
let grid;
let nextGrid;

let isRunning = false;
let playButton, stepButton;

// Probabilities for each rule
let probUnderpopulation = 1.0;
let probSurvival = 1.0;
let probOverpopulation = 1.0;
let probReproduction = 1.0;

function setup() {
  createCanvas(400, 400);
  cellSize = width / gridSize;
  grid = create2DArray(gridSize);
  nextGrid = create2DArray(gridSize);
  randomizeGrid();

  // Create control buttons
  playButton = createButton('Play');
  playButton.mousePressed(togglePlay);
  stepButton = createButton('Step');
  stepButton.mousePressed(stepSimulation);
}

function draw() {
  background(220);
  drawGrid();

  if (isRunning) {
    computeNextGeneration();
    swapGrids();
  }
}

function togglePlay() {
  isRunning = !isRunning;
  playButton.html(isRunning ? 'Pause' : 'Play');
}

function stepSimulation() {
  if (!isRunning) {
    computeNextGeneration();
    swapGrids();
  }
}

function mousePressed() {
  let j = floor(mouseX / cellSize);
  let i = floor(mouseY / cellSize);
  if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
    grid[i][j] = grid[i][j] === 1 ? 0 : 1;
  }
}

function create2DArray(size) {
  let arr = new Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = new Array(size).fill(0);
  }
  return arr;
}

function randomizeGrid() {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      grid[i][j] = random() < 0.5 ? 1 : 0;
    }
  }
}

function drawGrid() {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      fill(grid[i][j] === 1 ? 'black' : 'white');
      stroke(200);
      rect(j * cellSize, i * cellSize, cellSize, cellSize);
    }
  }
}

function computeNextGeneration() {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      let neighbors = countLiveNeighbors(i, j);
      let cell = grid[i][j];

      if (cell === 1) {
        if (neighbors < 2 && random() < probUnderpopulation) {
          nextGrid[i][j] = 0;
        } else if ((neighbors === 2 || neighbors === 3) && random() < probSurvival) {
          nextGrid[i][j] = 1;
        } else if (neighbors > 3 && random() < probOverpopulation) {
          nextGrid[i][j] = 0;
        } else {
          nextGrid[i][j] = cell;
        }
      } else {
        if (neighbors === 3 && random() < probReproduction) {
          nextGrid[i][j] = 1;
        } else {
          nextGrid[i][j] = cell;
        }
      }
    }
  }
}

function countLiveNeighbors(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      let ni = (x + i + gridSize) % gridSize;
      let nj = (y + j + gridSize) % gridSize;
      count += grid[ni][nj];
    }
  }
  return count;
}

function swapGrids() {
  let temp = grid;
  grid = nextGrid;
  nextGrid = temp;
}