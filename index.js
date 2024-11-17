/*
 * Instancira igru tako da stvori sve potrebne objekte i namjesti razmak između cigli da lijepo izgledaju na ekranu.
 */
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

/*
 * Glavna tick funkcija igre. Svaki put ponovo crta sve elemente igre i pomiče lopticu (ta funkcija radi provjeru kolizije).
 */
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

/*
 * Slušatelji za kretanje palice koju ju pomiću u dobro smjeru ovisno o pritisnutoj strelici.
 */
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

/*
 * Struktura koja definira glavnu strukturu igre. Prati canvas na kojem se sve crta i registrira tick funkciju. Uzeto manje više s prezentacije.
 */
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

    /*
     * Provjera kolizije palice i loptice.
     */
    checkBall(x, y) {
        return (x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height)
    }
}

class Brick {
    constructor(i, j, width, height, color) {
        this.i = i; // indeks reda u kojem se cigla nalazi
        this.j = j; // indeks stupca u kojem se cigla nalazi
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

    /*
     * Provjera kolizije nalazi li se neki x i y unutar cigle i ako se nalazi makni ciglu iz liste cigli. Malo miksa odgovornosti u kodu, ali jednostavno je :)
     */
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
        this.r = r; // radius
        this.color = color;
        this.x = elements.paddle.x + elements.paddle.width / 2;
        this.y = elements.paddle.y;
        this.vector = { // vektor kretanja, za vizualizaciju je moguće uključiti vecOn opciju u config strukturi.
            start: [this.x, this.y],
            end: [this.x - 50 * (Math.pow(-1, Number(Math.random() > 0.5)) * (Math.random() * 0.5 + 0.3)), this.y - 50 * Math.random()]
        }
    }

    /*
     * Funkcija normalizira vektor. Koristi se za pretvaranje vektora kretanja u jedinični vektor.
     */
    normalise(point) {
        let size = Math.sqrt(point[0] * point[0] + point[1] * point[1])
        return [point[0] / size, point[1] / size];
    }

    /*
     * Funkcija koja se pokreće svaki tick igre i koja pokušava pomaknuti lopticu i detektira kolizije kako bi znala kako pomaknuti lopticu.
     * Normalizira vektor kretanja i izračuna kako pomaknuti lopticu bazirano na njemu. Ako bi se desila kolizija okrene lopticu u suportnom smjeru.
     */
    move() {
        let normal = this.normalise([(this.vector.end[0] - this.vector.start[0]), (this.vector.end[1] - this.vector.start[1])])
        let new_x = Math.trunc(config.ballSpeed * normal[0]);
        let new_y = Math.trunc(config.ballSpeed * normal[1]);
        if (new_y == 0) {
            new_y = 10;
        }

        // Kolizija
        if (this.x + new_x <= 0) { // lijevi zid
            new_x = -new_x;
        } else if (this.x + new_x >= gameArea.canvas.width) { // desni zid
            new_x = -new_x;
        } else if (this.y + new_y <= 0) { // krov
            new_y = -new_y;
        } else if (elements.paddle.checkBall(this.x + new_x, this.y + new_y)) { // palica
            new_y = -new_y;
            new_x += Math.trunc(config.momentum * config.paddleSpeed / 10);
        } else if (this.y + new_y >= gameArea.canvas.height) { // dno ekrana
            endGame();
        } else {
            // cigle
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

/*
 * Funkcija uzima vrijednosti iz forme na početnom ekranu i pokreće igru.
 */
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

/*
 * Funkcija postavlja početne postavke u formu na početnom ekranu.
 */
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

/*
 * Ova struktura služi kao svojevrsna memorija za igru i prati na jednom mjestu sve elemente koji se koriste u igri.
 */
let elements = {
    paddle: undefined,
    ball: undefined,
    bricks: [],
}

/*
 * Ova struktura definira osnovne podatke o igri od koji su većina konfigurabilni u početnom ekrenu.
 */
let config = {
    paddleSpeed: 30,
    ballSpeed: 12,
    vecOn: false,
    bricksPerRow: 10,
    rows: 3,
    brickGap: 5,
    verticalGap: 5,
    momentum: 0 // Prati moment palice kako bi se loptica prirodnije kretala. Ako palica ide brzo u lijevu ponijet će lopticu više u lijevo.
}

