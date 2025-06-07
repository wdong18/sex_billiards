const Box2D = require('box2dweb');
require('./style.css'); // Webpack will handle this

// Constants for the game
const PPM = 100; // Pixels Per Meter for Box2D scaling
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const BALL_RADIUS = 15;
const POCKET_RADIUS = 25;
const CUE_BALL_POSITION = { x: 200, y: TABLE_HEIGHT / 2 };
const FORCE_MULTIPLIER = 5; // Adjusted for Box2D ApplyLinearImpulse

// Box2D Aliases
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2MassData = Box2D.Collision.Shapes.b2MassData;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

// Game state variables
let world; // Was: engine
// let render; // This will be removed, rendering handled manually
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
    // Initialize Box2D world
    const gravity = new b2Vec2(0, 0); // No gravity for a top-down view
    world = new b2World(gravity, true); // true to allow sleeping bodies

    // Create table boundaries (cushions) using Box2D
    const wallFixtureDef = new b2FixtureDef();
    wallFixtureDef.density = 1.0;
    wallFixtureDef.friction = 0.5;
    wallFixtureDef.restitution = 0.8;

    const wallBodyDef = new b2BodyDef();
    wallBodyDef.type = b2Body.b2_staticBody;

    // Top wall
    // Box2D's b2PolygonShape.SetAsBox takes half-width and half-height
    wallFixtureDef.shape = new b2PolygonShape();
    wallFixtureDef.shape.SetAsBox((TABLE_WIDTH - 80) / 2 / PPM, 10 / PPM);
    wallBodyDef.position.Set(TABLE_WIDTH / 2 / PPM, 10 / PPM);
    world.CreateBody(wallBodyDef).CreateFixture(wallFixtureDef);

    // Bottom wall
    wallFixtureDef.shape = new b2PolygonShape();
    wallFixtureDef.shape.SetAsBox((TABLE_WIDTH - 80) / 2 / PPM, 10 / PPM);
    wallBodyDef.position.Set(TABLE_WIDTH / 2 / PPM, (TABLE_HEIGHT - 10) / PPM);
    world.CreateBody(wallBodyDef).CreateFixture(wallFixtureDef);

    // Left wall
    wallFixtureDef.shape = new b2PolygonShape();
    wallFixtureDef.shape.SetAsBox(10 / PPM, (TABLE_HEIGHT - 80) / 2 / PPM);
    wallBodyDef.position.Set(10 / PPM, TABLE_HEIGHT / 2 / PPM);
    world.CreateBody(wallBodyDef).CreateFixture(wallFixtureDef);

    // Right wall
    wallFixtureDef.shape = new b2PolygonShape();
    wallFixtureDef.shape.SetAsBox(10 / PPM, (TABLE_HEIGHT - 80) / 2 / PPM);
    wallBodyDef.position.Set((TABLE_WIDTH - 10) / PPM, TABLE_HEIGHT / 2 / PPM);
    world.CreateBody(wallBodyDef).CreateFixture(wallFixtureDef);

    // Create pockets
    createPockets();

    // Create balls
    createBalls();

    // Event listeners
    setupEventListeners();

    // Collision detection will be set up via world.SetContactListener() later in init
    // --- Collision Detection ---
    const contactListener = new Box2D.Dynamics.b2ContactListener();

    contactListener.BeginContact = function(contact) {
        const fixtureA = contact.GetFixtureA();
        const fixtureB = contact.GetFixtureB();
        const bodyA = fixtureA.GetBody();
        const bodyB = fixtureB.GetBody();
        const userDataA = bodyA.GetUserData();
        const userDataB = bodyB.GetUserData();

        let ballBody = null;
        let pocketBody = null;

        // Check if bodyA is a ball and bodyB is a pocket
        if (userDataA && userDataA.isBall && pockets.includes(bodyB)) {
            ballBody = bodyA;
            pocketBody = bodyB;
        }
        // Check if bodyB is a ball and bodyA is a pocket
        else if (userDataB && userDataB.isBall && pockets.includes(bodyA)) {
            ballBody = bodyB;
            pocketBody = bodyA;
        }

        if (ballBody && pocketBody) {
            // Ensure not to process the same collision multiple times if already destroying body
            if (ballBody.GetUserData().isPocketed) return;
            ballBody.GetUserData().isPocketed = true; // Mark as pocketed
            handlePocketCollision(ballBody);
        }
    };

    contactListener.EndContact = function(contact) {
        // Can be used for things like ball leaving pocket (if it wasn't removed)
    };
    contactListener.PreSolve = function(contact, oldManifold) {
        // Can be used to disable contacts dynamically
    };
    contactListener.PostSolve = function(contact, impulse) {
        // Can be used to react to collision impulses
    };

    world.SetContactListener(contactListener);
}

// Create table pockets
function createPockets() {
    pockets = []; // Ensure pockets array is clean

    const pocketFixtureDef = new b2FixtureDef();
    pocketFixtureDef.isSensor = true; // This makes it a sensor
    pocketFixtureDef.shape = new b2CircleShape(POCKET_RADIUS / PPM);
    // Other properties like friction, restitution are not typically needed for sensors.

    const pocketBodyDef = new b2BodyDef();
    pocketBodyDef.type = b2Body.b2_staticBody;

    const pocketPositions = [
        { x: 20, y: 20 },                        // Top-left
        { x: TABLE_WIDTH / 2, y: 15 },           // Top-middle
        { x: TABLE_WIDTH - 20, y: 20 },          // Top-right
        { x: 20, y: TABLE_HEIGHT - 20 },         // Bottom-left
        { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - 15 }, // Bottom-middle
        { x: TABLE_WIDTH - 20, y: TABLE_HEIGHT - 20 } // Bottom-right
    ];

    pocketPositions.forEach(pos => {
        pocketBodyDef.position.Set(pos.x / PPM, pos.y / PPM);
        const pocketBody = world.CreateBody(pocketBodyDef);
        pocketBody.CreateFixture(pocketFixtureDef);
        // We need to store the Box2D body itself, or at least its fixture, for collision detection.
        // Storing the body is simpler for now.
        pockets.push(pocketBody);
    });
}

// Create billiard balls
function createBalls() {
    balls = []; // Clear the array

    // --- Cue Ball ---
    const cueBodyDef = new b2BodyDef();
    cueBodyDef.type = b2Body.b2_dynamicBody;
    cueBodyDef.position.Set(CUE_BALL_POSITION.x / PPM, CUE_BALL_POSITION.y / PPM);
    cueBodyDef.bullet = true; // For fast moving objects

    const cueFixtureDef = new b2FixtureDef();
    cueFixtureDef.shape = new b2CircleShape(BALL_RADIUS / PPM);
    cueFixtureDef.density = 1.0;
    cueFixtureDef.friction = 0.25;
    cueFixtureDef.restitution = 0.75;

    cue = world.CreateBody(cueBodyDef);
    cue.CreateFixture(cueFixtureDef);
    cue.SetLinearDamping(0.5); // For rolling/air resistance
    cue.SetUserData({ id: 'cue', color: BALL_COLORS[0], isBall: true });
    balls.push(cue);

    // --- Numbered Balls ---
    const startX = 600; // Pixel coordinates
    const startY = TABLE_HEIGHT / 2;
    const spacing = BALL_RADIUS * 2 + 1; // Pixel spacing

    let ballCount = 1;
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
            if (ballCount <= 15) {
                const x = startX + row * spacing * Math.sqrt(3) / 2;
                const y = startY - (row * spacing / 2) + col * spacing;

                const ballBodyDef = new b2BodyDef();
                ballBodyDef.type = b2Body.b2_dynamicBody;
                ballBodyDef.position.Set(x / PPM, y / PPM);
                ballBodyDef.bullet = true; // For fast moving objects

                const ballFixtureDef = new b2FixtureDef();
                ballFixtureDef.shape = new b2CircleShape(BALL_RADIUS / PPM);
                ballFixtureDef.density = 1.0;
                ballFixtureDef.friction = 0.25;
                ballFixtureDef.restitution = 0.75;

                const ballBody = world.CreateBody(ballBodyDef);
                ballBody.CreateFixture(ballFixtureDef);
                ballBody.SetLinearDamping(0.5);
                ballBody.SetUserData({ id: `ball${ballCount}`, color: BALL_COLORS[ballCount], isBall: true, number: ballCount });

                balls.push(ballBody);
                ballCount++;
            }
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    resetButton.addEventListener('click', resetGame);
}

// Handle ball falling into pocket
function handlePocketCollision(ballBody) { // Renamed parameter
    // Remove from balls array
    // Important: Do this BEFORE destroying the body, as user data might be lost
    const index = balls.indexOf(ballBody);
    if (index > -1) {
        balls.splice(index, 1);
    }

    const ballUserData = ballBody.GetUserData();

    // Remove the ball from the world
    // Schedule for destruction after world step if issues arise
    world.DestroyBody(ballBody);

    // Score points
    if (ballUserData.id === 'cue') {
        // Cue ball went in - foul
        resetCueBall(); // This function already handles creating a new cue and adding to 'balls'
        switchPlayer();
    } else {
        // Regular ball went in
        if (ballUserData.id === 'ball8') {
            // 8 ball went in
            endGame();
        } else {
            // Other ball went in
            updateScore();
            // Note: Player does not switch here, they continue playing.
            // SwitchPlayer() is only called for a foul or if no ball is pocketed.
            // This logic might need review based on actual game rules.
        }
    }
}

// Reset cue ball position
function resetCueBall() {
    // cue is already a global variable, find and remove old one if it exists
    if (cue && cue.GetWorld()) { // Check if cue exists and is part of a world
        world.DestroyBody(cue);
    }

    const cueBodyDef = new b2BodyDef();
    cueBodyDef.type = b2Body.b2_dynamicBody;
    cueBodyDef.position.Set(CUE_BALL_POSITION.x / PPM, CUE_BALL_POSITION.y / PPM);
    cueBodyDef.bullet = true;

    const cueFixtureDef = new b2FixtureDef();
    cueFixtureDef.shape = new b2CircleShape(BALL_RADIUS / PPM);
    cueFixtureDef.density = 1.0;
    cueFixtureDef.friction = 0.25;
    cueFixtureDef.restitution = 0.75;

    cue = world.CreateBody(cueBodyDef);
    cue.CreateFixture(cueFixtureDef);
    cue.SetLinearDamping(0.5);
    cue.SetUserData({ id: 'cue', color: BALL_COLORS[0], isBall: true });

    // Add to balls array, ensuring no duplicates if called mid-game
    // First, remove any existing cue ball from the 'balls' array by checking user data
    for (let i = balls.length - 1; i >= 0; i--) {
        const userData = balls[i].GetUserData();
        if (userData && userData.id === 'cue') {
            balls.splice(i, 1);
            break;
        }
    }
    balls.push(cue);
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
    // Render.world(render); // Removed for Box2D
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
    if (mouseStartPos && mouseEndPos && cue) { // Ensure cue is valid
        // Convert mouse displacement to a force vector
        // The original FORCE_MULTIPLIER might be too small or too large for Box2D.
        // We can adjust FORCE_MULTIPLIER later.
        // For ApplyLinearImpulse, the vector represents the change in momentum.
        const impulse = new b2Vec2(
            (mouseStartPos.x - mouseEndPos.x) * FORCE_MULTIPLIER,
            (mouseStartPos.y - mouseEndPos.y) * FORCE_MULTIPLIER
        );

        // Apply the impulse to the center of the cue ball.
        // It's better to ensure the ball is awake before applying impulse
        cue.SetAwake(true);
        cue.ApplyLinearImpulse(impulse, cue.GetPosition()); // GetPosition() is center for circle
    }

    // Reset aiming
    mouseStartPos = null;
    mouseEndPos = null;
    isAiming = false;
}

// Draw aiming line
function drawAimingLine() {
    if (!mouseStartPos || !mouseEndPos) return;

    // const context = render.context; // Removed for Box2D, will be re-added
    // TODO: Get canvas context directly
    const canvas = document.getElementById('billiards-table');
    const context = canvas.getContext('2d');
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
function isAimingInProgress() { // Renamed from isAnyBallMoving for clarity
    for (let i = 0; i < balls.length; i++) {
        if (balls[i] && balls[i].GetLinearVelocity) { // Check if body exists and has method
             const velocity = balls[i].GetLinearVelocity();
             // Box2D's b2Vec2 doesn't have a direct magnitude() or length() like Matter.Vector
             // We calculate it manually: sqrt(x*x + y*y)
             const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
             if (speed > 0.01) { // Threshold for movement in m/s
                 return true;
             }
        }
    }
    // Also check angular velocity if balls can spin significantly
    for (let i = 0; i < balls.length; i++) {
         if (balls[i] && balls[i].GetAngularVelocity && Math.abs(balls[i].GetAngularVelocity()) > 0.01) {
             return true;
         }
    }
    return false;
}

// Reset the game
function resetGame() {
    // Clear existing balls from the Box2D world and the 'balls' array
    // Iterate backwards to safely remove elements from the array
    for (let i = balls.length - 1; i >= 0; i--) {
        const ballBody = balls[i];
        if (ballBody && ballBody.GetWorld()) { // Check if body exists and is in a world
            world.DestroyBody(ballBody);
        }
    }
    balls = []; // Reset the array after all bodies are destroyed
    cue = null; // Explicitly nullify cue

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