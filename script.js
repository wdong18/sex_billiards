// Constants for the game
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const BALL_RADIUS = 15;
const POCKET_RADIUS = 25;
const CUE_BALL_POSITION = { x: 200, y: TABLE_HEIGHT / 2 };
const FORCE_MULTIPLIER = 0.2;

// Matter.js module aliases
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;
const Vector = Matter.Vector;

// Game state variables
let engine;
let render;
let balls = [];
let pockets = [];
let cue;
let mouseStartPos = null;
let mouseEndPos = null;
let isAiming = false;
let currentPlayer = 1;
let player1Score = 0;
let player2Score = 0;
let gameActive = true;

// DOM elements
const canvas = document.getElementById('billiards-table');
const player1ScoreElement = document.getElementById('player1-score');
const player2ScoreElement = document.getElementById('player2-score');
const resetButton = document.getElementById('reset-game');

// Colors
const BALL_COLORS = [
    '#ffffff', // Cue ball (0)
    '#ffdd00', // Solid yellow (1)
    '#0000ff', // Solid blue (2)
    '#ff0000', // Solid red (3)
    '#800080', // Solid purple (4)
    '#ff6600', // Solid orange (5)
    '#00ff00', // Solid green (6)
    '#8b4513', // Solid brown (7)
    '#000000', // 8-ball (8)
    '#ffdd00', // Striped yellow (9)
    '#0000ff', // Striped blue (10)
    '#ff0000', // Striped red (11)
    '#800080', // Striped purple (12)
    '#ff6600', // Striped orange (13)
    '#00ff00', // Striped green (14)
    '#8b4513'  // Striped brown (15)
];

// Initialize the game
function init() {
    // Create engine
    engine = Engine.create({
        enableSleeping: true
    });
    engine.world.gravity.y = 0;

    // Create renderer
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: TABLE_WIDTH,
            height: TABLE_HEIGHT,
            wireframes: false,
            background: '#0a4d1c'
        }
    });

    // Create table boundaries (cushions)
    const wallOptions = {
        isStatic: true,
        restitution: 0.9,
        friction: 0.1,
        render: {
            fillStyle: '#0a4d1c',
            strokeStyle: '#0a4d1c',
            lineWidth: 1
        }
    };

    // Top wall
    const topWall = Bodies.rectangle(TABLE_WIDTH / 2, 10, TABLE_WIDTH - 80, 20, wallOptions);
    // Bottom wall
    const bottomWall = Bodies.rectangle(TABLE_WIDTH / 2, TABLE_HEIGHT - 10, TABLE_WIDTH - 80, 20, wallOptions);
    // Left wall
    const leftWall = Bodies.rectangle(10, TABLE_HEIGHT / 2, 20, TABLE_HEIGHT - 80, wallOptions);
    // Right wall
    const rightWall = Bodies.rectangle(TABLE_WIDTH - 10, TABLE_HEIGHT / 2, 20, TABLE_HEIGHT - 80, wallOptions);

    World.add(engine.world, [topWall, bottomWall, leftWall, rightWall]);

    // Create pockets
    createPockets();

    // Create balls
    createBalls();

    // Start the engine and renderer
    Engine.run(engine);
    Render.run(render);

    // Event listeners
    setupEventListeners();

    // Collision events
    setupCollisionEvents();
}

// Create table pockets
function createPockets() {
    const pocketPositions = [
        { x: 20, y: 20 },                        // Top-left
        { x: TABLE_WIDTH / 2, y: 15 },           // Top-middle
        { x: TABLE_WIDTH - 20, y: 20 },          // Top-right
        { x: 20, y: TABLE_HEIGHT - 20 },         // Bottom-left
        { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - 15 }, // Bottom-middle
        { x: TABLE_WIDTH - 20, y: TABLE_HEIGHT - 20 } // Bottom-right
    ];

    pocketPositions.forEach(pos => {
        const pocket = Bodies.circle(pos.x, pos.y, POCKET_RADIUS, {
            isStatic: true,
            isSensor: true,
            render: {
                fillStyle: '#000000'
            }
        });
        pockets.push(pocket);
        World.add(engine.world, pocket);
    });
}

// Create billiard balls
function createBalls() {
    balls = [];
    
    // Create cue ball
    cue = Bodies.circle(CUE_BALL_POSITION.x, CUE_BALL_POSITION.y, BALL_RADIUS, {
        restitution: 0.9,
        friction: 0.1,
        frictionAir: 0.02,
        density: 0.8,
        label: 'cue',
        render: {
            fillStyle: BALL_COLORS[0]
        }
    });
    balls.push(cue);

    // Create rack of 15 balls in triangle formation
    const startX = 600;
    const startY = TABLE_HEIGHT / 2;
    const spacing = BALL_RADIUS * 2 + 1;
    
    let ballCount = 1;
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
            if (ballCount <= 15) {
                const x = startX + row * spacing * Math.sqrt(3) / 2;
                const y = startY - (row * spacing / 2) + col * spacing;
                
                const ball = Bodies.circle(x, y, BALL_RADIUS, {
                    restitution: 0.9,
                    friction: 0.1,
                    frictionAir: 0.02,
                    density: 0.8,
                    label: `ball${ballCount}`,
                    render: {
                        fillStyle: BALL_COLORS[ballCount]
                    }
                });
                
                balls.push(ball);
                ballCount++;
            }
        }
    }
    
    World.add(engine.world, balls);
}

// Set up event listeners
function setupEventListeners() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    resetButton.addEventListener('click', resetGame);
}

// Set up collision events
function setupCollisionEvents() {
    Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            // Check if a ball collided with a pocket
            if (pockets.includes(pair.bodyA) && balls.includes(pair.bodyB)) {
                handlePocketCollision(pair.bodyB);
            } else if (pockets.includes(pair.bodyB) && balls.includes(pair.bodyA)) {
                handlePocketCollision(pair.bodyA);
            }
        }
    });
}

// Handle ball falling into pocket
function handlePocketCollision(ball) {
    // Remove the ball from the world
    World.remove(engine.world, ball);
    
    // Remove from balls array
    const index = balls.indexOf(ball);
    if (index > -1) {
        balls.splice(index, 1);
    }
    
    // Score points
    if (ball === cue) {
        // Cue ball went in - foul
        resetCueBall();
        switchPlayer();
    } else {
        // Regular ball went in
        if (ball.label === 'ball8') {
            // 8 ball went in
            endGame();
        } else {
            // Other ball went in
            updateScore();
        }
    }
}

// Reset cue ball position
function resetCueBall() {
    cue = Bodies.circle(CUE_BALL_POSITION.x, CUE_BALL_POSITION.y, BALL_RADIUS, {
        restitution: 0.9,
        friction: 0.1,
        frictionAir: 0.02,
        density: 0.8,
        label: 'cue',
        render: {
            fillStyle: BALL_COLORS[0]
        }
    });
    balls.push(cue);
    World.add(engine.world, cue);
}

// Update score
function updateScore() {
    if (currentPlayer === 1) {
        player1Score++;
        player1ScoreElement.textContent = player1Score;
    } else {
        player2Score++;
        player2ScoreElement.textContent = player2Score;
    }
}

// Switch player
function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
}

// End the game
function endGame() {
    gameActive = false;
    alert(`Player ${currentPlayer} wins!`);
}

// Handle mouse down event
function handleMouseDown(event) {
    if (!gameActive || isAimingInProgress()) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    mouseStartPos = { x: mouseX, y: mouseY };
    isAiming = true;
}

// Handle mouse move event
function handleMouseMove(event) {
    if (!isAiming) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    mouseEndPos = { x: mouseX, y: mouseY };
    
    // Redraw with aiming line
    Render.world(render);
    drawAimingLine();
}

// Handle mouse up event
function handleMouseUp(event) {
    if (!isAiming) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    mouseEndPos = { x: mouseX, y: mouseY };
    
    // Apply force to cue ball
    if (mouseStartPos && mouseEndPos) {
        const force = {
            x: (mouseStartPos.x - mouseEndPos.x) * FORCE_MULTIPLIER,
            y: (mouseStartPos.y - mouseEndPos.y) * FORCE_MULTIPLIER
        };
        
        Body.applyForce(cue, cue.position, force);
    }
    
    // Reset aiming
    mouseStartPos = null;
    mouseEndPos = null;
    isAiming = false;
}

// Draw aiming line
function drawAimingLine() {
    if (!mouseStartPos || !mouseEndPos) return;
    
    const context = render.context;
    context.beginPath();
    context.moveTo(cue.position.x, cue.position.y);
    
    // Calculate the direction vector
    const dirX = cue.position.x - mouseEndPos.x;
    const dirY = cue.position.y - mouseEndPos.y;
    
    // Normalize and extend the line
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    const normalizedX = dirX / length;
    const normalizedY = dirY / length;
    
    const endX = cue.position.x + normalizedX * 100;
    const endY = cue.position.y + normalizedY * 100;
    
    context.lineTo(endX, endY);
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.stroke();
}

// Check if any balls are still moving
function isAimingInProgress() {
    for (let i = 0; i < balls.length; i++) {
        const speed = Vector.magnitude(balls[i].velocity);
        if (speed > 0.1) {
            return true;
        }
    }
    return false;
}

// Reset the game
function resetGame() {
    // Clear existing balls
    for (let i = 0; i < balls.length; i++) {
        World.remove(engine.world, balls[i]);
    }
    
    // Reset scores and game state
    player1Score = 0;
    player2Score = 0;
    player1ScoreElement.textContent = '0';
    player2ScoreElement.textContent = '0';
    currentPlayer = 1;
    gameActive = true;
    
    // Create new balls
    createBalls();
}

// Initialize the game when the page loads
window.onload = init; 