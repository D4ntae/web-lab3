function startGame() {
    gameArea.start();
    elements.paddle = new Paddle(125, 15, 'red');
    elements.ball = new Ball(5, 'black');

    let brick_width = gameArea.canvas.width / config.bricksPerRow - config.brickGap * 2;
    config.brickGap = Math.ceil((gameArea.canvas.width - config.bricksPerRow * brick_width) / (config.bricksPerRow + 2))
    for (let i = 0; i < config.rows; i++) {
        elements.bricks.push([])
        for (let j = 0; j < config.bricksPerRow; j++) {
            elements.bricks[i].push(new Brick(i, j, brick_width, 25, 'blue'));
        }
    }
}

function updateGameArea() {
    gameArea.clear();
    if (config.momentum > 0) {
        config.momentum -= 0.05;
    } else {
        config.momentum += 0.05;
    }
    elements.paddle.draw();
    elements.ball.move();
    elements.ball.draw();
    for (let row of elements.bricks) {
        for (let brick of row) {
            if (brick != undefined) {
                brick.draw();
            }
        }
    }

    let ctx = gameArea.context;
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";

    let curr = elements.bricks.flat().filter(b => b != undefined).length;
    let max = config.bricksPerRow * config.rows;
    ctx.fillText(`Score: ${max - curr}/${max}`, gameArea.canvas.width - 125, 20);

    if (curr == 0) {
        winGame();
        return;
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        elements.paddle.moveLeft();
        if (config.momentum > -1) {
            config.momentum -= 0.1;
        }
    } else if (event.key === 'ArrowRight') {
        elements.paddle.moveRight();
        if (config.momentum < 1) {
            config.momentum += 0.1;
        }
    }
});

let gameArea = {
    canvas : document.createElement("canvas"),
    start : function() {
        if (document.body.childNodes[0] == this.canvas) {
            this.canvas.style.display = "block";
        } else {
            this.canvas.focus();
            this.canvas.style.zIndex = 1000;
            this.canvas.id = "breakoutCanvas";
            this.canvas.width = window.innerWidth - 20;
            this.canvas.height = window.innerHeight - 20;
            this.context = this.canvas.getContext("2d");
            document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        }
        this.frameNo = 0;
        this.interval = setInterval(updateGameArea, 20);
    },
    stop : function() {
        clearInterval(this.interval);
    },
    clear : function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class Paddle {
    constructor(width, height, color) {
        this.width = width;
        this.height = height;
        this.color = color;
        this.x = gameArea.canvas.width / 2 - this.width;
        this.y = gameArea.canvas.height - 50;
    }

    draw() {
        let ctx = gameArea.context;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    moveLeft() {
        if (this.x - config.paddleSpeed >= -10) {
            this.x -= config.paddleSpeed;
        }
    }

    moveRight() {
        if (this.x + config.paddleSpeed + this.width <= gameArea.canvas.width + 10) {
            this.x += config.paddleSpeed;
        }
    }

    checkBall(x, y) {
        return (x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height)
    }
}

class Brick {
    constructor(i, j, width, height, color) {
        this.i = i;
        this.j = j;
        this.width = width;
        this.height = height;
        this.color = color;
        this.x = (this.j + 1) * config.brickGap + (this.j * this.width);
        this.y = (this.i + 1) * config.verticalGap + ((this.i + 1) * this.height);
    }

    draw() {
        let ctx = gameArea.context;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    checkBall(x, y) {
        if (x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height) {
            elements.bricks[this.i][this.j] = undefined;
            return true;
        } else {
            return false;
        }
    }
}

class Ball {
    constructor(r, color) {
        this.r = r;
        this.color = color;
        this.x = elements.paddle.x + elements.paddle.width / 2;
        this.y = elements.paddle.y;
        this.vector = {
            start: [this.x, this.y],
            end: [this.x - 50 * (Math.pow(-1, Number(Math.random() > 0.5)) * (Math.random() * 0.5 + 0.3)), this.y - 50 * Math.random()]
        }
    }

    normalise(point) {
        let size = Math.sqrt(point[0] * point[0] + point[1] * point[1])
        return [point[0] / size, point[1] / size];
    }

    getUnitVec() {
        return {
            start: this.normalise(this.vector.start),
            end: this.normalise(this.vector.end)
        }
    }
   
    move() {
        let normal = this.normalise([(this.vector.end[0] - this.vector.start[0]), (this.vector.end[1] - this.vector.start[1])])
        let new_x = Math.trunc(config.ballSpeed * normal[0]);
        let new_y = Math.trunc(config.ballSpeed * normal[1]);
        if (new_y == 0) {
            new_y = 10;
        }

        // Collision detection
        if (this.x + new_x <= 0) { // left wall
            new_x = -new_x;
        } else if (this.x + new_x >= gameArea.canvas.width) { // right wall
            new_x = -new_x;
        } else if (this.y + new_y <= 0) { // roof
            new_y = -new_y;
        } else if (elements.paddle.checkBall(this.x + new_x, this.y + new_y)) { // paddle
            new_y = -new_y;
            new_x += Math.trunc(config.momentum * config.paddleSpeed / 10);
        } else if (this.y + new_y >= gameArea.canvas.height) {
            endGame();
        } else {
            // brick collision check
            for (let brick of elements.bricks.flat()) {
                if (brick != undefined) {
                    if (brick.checkBall(this.x, this.y)) {
                        new_y = -new_y;
                        break;
                    }
                }
            }
        }

        this.x += new_x;
        this.y += new_y;

        this.vector.start = [this.x, this.y]
        this.vector.end = [this.x + new_x, this.y + new_y]
    }

    draw() {
        let ctx = gameArea.context;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();

        if (config.vecOn) {
            ctx.beginPath();
            ctx.moveTo(this.vector.start[0], this.vector.start[1]);
            ctx.lineTo(this.vector.end[0], this.vector.end[1]);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }
}

function setupGame(e) {
    e.preventDefault();

    let paddleSpeed = document.getElementById("brzina-lopatice").value;
    let ballSpeed = document.getElementById("brzina-loptice").value;
    let bricksPerRow = document.getElementById("cigle-po-redu").value;
    let rows = document.getElementById("redovi").value;

    config.paddleSpeed = parseInt(paddleSpeed);
    config.ballSpeed = parseInt(ballSpeed);
    config.bricksPerRow = parseInt(bricksPerRow);
    config.rows = parseInt(rows);

    document.getElementById("form-container").style.display = "none";

    startGame();
}

function defaultSettings() {
    let paddleSpeed = document.getElementById("brzina-lopatice");
    paddleSpeed.value = config.paddleSpeed;

    let ballSpeed = document.getElementById("brzina-loptice");
    ballSpeed.value = config.ballSpeed;

    let bricksPerRow = document.getElementById("cigle-po-redu");
    bricksPerRow.value = config.bricksPerRow;

    let rows = document.getElementById("redovi");
    rows.value = config.rows;

    const form = document.getElementById("settings-form");
    form.addEventListener("submit", setupGame);
}

function endGame() {
    gameArea.stop();
    gameArea.clear();
    document.getElementById("game-over").style.display = "block";
    document.getElementById("game-win").style.display = "none";
    gameArea.canvas.style.display = "none";
}

function winGame() {
    gameArea.stop();
    gameArea.clear();
    document.getElementById("game-over").style.display = "none";
    document.getElementById("game-win").style.display = "block";
    gameArea.canvas.style.display = "none";
}

function retryGame() {
    document.getElementById("game-over").style.display = "none";
    document.getElementById("game-win").style.display = "none";
    gameArea.canvas.style.display = "none";
    
    document.getElementById("form-container").style.display = "block";

    elements.paddle = undefined;
    elements.ball = undefined;
    elements.bricks = [];
    config.brickGap = 5;
}


let elements = {
    paddle: undefined,
    ball: undefined,
    bricks: [],
}

let config = {
    paddleSpeed: 30,
    ballSpeed: 12,
    vecOn: false,
    bricksPerRow: 10,
    rows: 3,
    brickGap: 5,
    verticalGap: 5,
    momentum: 0
}

