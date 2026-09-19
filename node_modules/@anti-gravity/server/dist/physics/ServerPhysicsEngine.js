"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerPhysicsEngine = void 0;
const matter_js_1 = __importDefault(require("matter-js"));
const shared_1 = require("@anti-gravity/shared");
const { Engine, World, Bodies, Body } = matter_js_1.default;
class ServerPhysicsEngine {
    engine;
    world;
    cells = [];
    tokenMap = new Map();
    gravityVector = { ...shared_1.DEFAULT_GRAVITY_VECTOR };
    gravityScale = shared_1.DEFAULT_GRAVITY_SCALE;
    tokenCounter = 0;
    constructor() {
        this.engine = Engine.create({
            gravity: {
                x: this.gravityVector.x,
                y: this.gravityVector.y,
                scale: this.gravityScale,
            },
        });
        this.world = this.engine.world;
        this.initArena();
        this.initCells();
    }
    /**
     * Initializes arena walls and internal slotted baffles
     */
    initArena() {
        const wallOptions = {
            isStatic: true,
            restitution: 0.3,
            friction: 0.1,
            label: 'arena_wall',
        };
        // Outer perimeter walls bounding the [120, 680] playable arena
        const topWall = Bodies.rectangle(400, 105, 600, 30, wallOptions);
        const bottomWall = Bodies.rectangle(400, 695, 600, 30, wallOptions);
        const leftWall = Bodies.rectangle(105, 400, 30, 600, wallOptions);
        const rightWall = Bodies.rectangle(695, 400, 30, 600, wallOptions);
        World.add(this.world, [topWall, bottomWall, leftWall, rightWall]);
        // Segmented column dividers at x = 310 and x = 490
        // Segmented to allow tokens to shift across columns during high-energy gravity anomalies
        const dividerOptions = {
            isStatic: true,
            restitution: 0.3,
            friction: 0.2,
            label: 'grid_divider',
        };
        const dividerX = [shared_1.COL_BOUNDARIES[1], shared_1.COL_BOUNDARIES[2]]; // 310, 490
        dividerX.forEach((x) => {
            // Top segment
            World.add(this.world, Bodies.rectangle(x, 205, 14, 150, dividerOptions));
            // Bottom segment
            World.add(this.world, Bodies.rectangle(x, 570, 14, 150, dividerOptions));
        });
    }
    /**
     * Initializes the 3x3 logical cell boundaries
     */
    initCells() {
        this.cells = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const index = row * 3 + col;
                const minX = shared_1.COL_BOUNDARIES[col];
                const maxX = shared_1.COL_BOUNDARIES[col + 1];
                const minY = shared_1.ROW_BOUNDARIES[row];
                const maxY = shared_1.ROW_BOUNDARIES[row + 1];
                this.cells.push({
                    index,
                    row,
                    col,
                    center: {
                        x: shared_1.COL_CENTERS[col],
                        y: shared_1.ROW_CENTERS[row],
                    },
                    bounds: { minX, maxX, minY, maxY },
                    claimedBy: null,
                });
            }
        }
    }
    /**
     * Advance physics simulation by deltaTime (in ms)
     */
    step(deltaTimeMs) {
        Engine.update(this.engine, deltaTimeMs);
        this.updateSettlement(deltaTimeMs);
    }
    /**
     * Check if a point is within a cell's boundary
     */
    isPointInCell(point, cell) {
        return (point.x >= cell.bounds.minX &&
            point.x <= cell.bounds.maxX &&
            point.y >= cell.bounds.minY &&
            point.y <= cell.bounds.maxY);
    }
    /**
     * Update settlement status for all active tokens
     */
    updateSettlement(deltaTimeMs) {
        // Reset claimed states before recalculating from settled tokens
        for (const cell of this.cells) {
            cell.claimedBy = null;
        }
        for (const [_, item] of this.tokenMap) {
            const pos = item.body.position;
            const vel = item.body.velocity;
            const angVel = item.body.angularVelocity;
            const speed = Math.hypot(vel.x, vel.y);
            const angSpeed = Math.abs(angVel);
            // Find cell this token is currently in
            let foundCellIndex = null;
            for (let i = 0; i < this.cells.length; i++) {
                if (this.isPointInCell(pos, this.cells[i])) {
                    foundCellIndex = i;
                    break;
                }
            }
            item.currentCellIndex = foundCellIndex;
            // Settlement conditions: inside a cell and linear/angular velocity below epsilon
            const isSubVelocity = speed < shared_1.SETTLEMENT_LINEAR_VELOCITY_EPSILON &&
                angSpeed < shared_1.SETTLEMENT_ANGULAR_VELOCITY_EPSILON;
            if (foundCellIndex !== null && isSubVelocity) {
                item.settlementTimerMs += deltaTimeMs;
                if (item.settlementTimerMs >= shared_1.SETTLEMENT_DURATION_MS) {
                    item.isSettled = true;
                }
            }
            else {
                // If movement exceeds threshold or token leaves cell, reset timer
                item.settlementTimerMs = 0;
                item.isSettled = false;
            }
        }
        // Assign cell claims based on settled tokens
        // If multiple settled tokens are in a cell, the one closest to cell center wins claim
        for (const cell of this.cells) {
            let closestToken = null;
            let minDistance = Infinity;
            for (const [_, item] of this.tokenMap) {
                if (item.isSettled && item.currentCellIndex === cell.index) {
                    const dist = Math.hypot(item.body.position.x - cell.center.x, item.body.position.y - cell.center.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestToken = item;
                    }
                }
            }
            if (closestToken) {
                cell.claimedBy = closestToken.owner;
            }
        }
    }
    /**
     * Spawns a new token into the specified column (0, 1, 2)
     */
    addToken(symbol, col, dropImpulse) {
        this.tokenCounter++;
        const id = `token-${symbol}-${Date.now()}-${this.tokenCounter}`;
        const clampedCol = Math.max(0, Math.min(2, col));
        const spawnX = shared_1.COL_CENTERS[clampedCol];
        // Spawn location depends on gravity vector:
        // If gravity points upward (gy < 0), spawn near bottom (y = 650)
        // If gravity points downward (gy > 0), spawn near top (y = 150)
        let spawnY = 640;
        if (this.gravityVector.y > 0.2) {
            spawnY = 150;
        }
        else if (this.gravityVector.y < -0.2) {
            spawnY = 640;
        }
        else {
            spawnY = 600;
        }
        let tokenBody;
        if (symbol === 'X') {
            // X Token: Heavy square body with high mass and angular drag
            const size = 145;
            tokenBody = Bodies.rectangle(spawnX, spawnY, size, size, {
                mass: 3.5,
                friction: 0.25,
                frictionAir: 0.03,
                restitution: 0.2,
                label: `token_${id}`,
            });
        }
        else {
            // O Token: Spherical body with high restitution (bounciness) and lower friction
            const radius = 72.5;
            tokenBody = Bodies.circle(spawnX, spawnY, radius, {
                mass: 1.5,
                friction: 0.04,
                frictionAir: 0.01,
                restitution: 0.45,
                label: `token_${id}`,
            });
        }
        World.add(this.world, tokenBody);
        // Apply baseline drop impulse or upward lift
        const baseImpulseY = this.gravityVector.y < 0 ? -0.05 : 0.05;
        const impulse = dropImpulse || { x: (Math.random() - 0.5) * 0.005, y: baseImpulseY };
        Body.applyForce(tokenBody, tokenBody.position, impulse);
        // Micro-impulse placement: exert micro concussion on nearby existing tokens
        this.applyMicroImpulse(tokenBody.position, 250, 0.02);
        const tracking = {
            id,
            owner: symbol,
            body: tokenBody,
            settlementTimerMs: 0,
            currentCellIndex: null,
            isSettled: false,
        };
        this.tokenMap.set(id, tracking);
        return {
            id,
            owner: symbol,
            position: { x: tokenBody.position.x, y: tokenBody.position.y },
            velocity: { x: tokenBody.velocity.x, y: tokenBody.velocity.y },
            angle: tokenBody.angle,
            angularVelocity: tokenBody.angularVelocity,
            mass: tokenBody.mass,
            isSettled: false,
            settledCellIndex: null,
        };
    }
    /**
     * Applies micro-impulse concussion radiating from placement point
     */
    applyMicroImpulse(origin, radius, strength) {
        for (const [_, item] of this.tokenMap) {
            const pos = item.body.position;
            const dx = pos.x - origin.x;
            const dy = pos.y - origin.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < radius) {
                const factor = (1 - dist / radius) * strength;
                const fx = (dx / dist) * factor;
                const fy = (dy / dist) * factor;
                Body.applyForce(item.body, pos, { x: fx, y: fy });
            }
        }
    }
    /**
     * Updates gravity vector and scale
     */
    setGravity(vector, scale = this.gravityScale) {
        this.gravityVector = { ...vector };
        this.gravityScale = scale;
        this.engine.gravity.x = vector.x;
        this.engine.gravity.y = vector.y;
        this.engine.gravity.scale = scale;
    }
    /**
     * Rotate gravity by 90 degrees or arbitrary angle
     */
    rotateGravity(degrees = 90) {
        const radians = (degrees * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const newX = Math.round((this.gravityVector.x * cos - this.gravityVector.y * sin) * 1000) / 1000;
        const newY = Math.round((this.gravityVector.x * sin + this.gravityVector.y * cos) * 1000) / 1000;
        this.setGravity({ x: newX, y: newY });
        return {
            newVector: { ...this.gravityVector },
            intensity: this.gravityScale,
        };
    }
    /**
     * Invert gravity vector (180 deg)
     */
    invertGravity() {
        return this.rotateGravity(180);
    }
    /**
     * Checks the board status for winner or draw
     */
    checkBoardStatus() {
        const matrix = this.cells.map((c) => c.claimedBy);
        for (const combo of shared_1.WINNING_COMBINATIONS) {
            const [a, b, c] = combo;
            if (matrix[a] && matrix[a] === matrix[b] && matrix[a] === matrix[c]) {
                return {
                    matrix,
                    winner: matrix[a],
                    winningLine: [a, b, c],
                };
            }
        }
        // Check for draw: all 9 cells settled and claimed
        const allClaimed = matrix.every((val) => val !== null);
        if (allClaimed) {
            return {
                matrix,
                winner: 'DRAW',
                winningLine: null,
            };
        }
        return {
            matrix,
            winner: null,
            winningLine: null,
        };
    }
    /**
     * Exports authoritative world state snapshot
     */
    getSnapshot() {
        const tokens = Array.from(this.tokenMap.values()).map((item) => ({
            id: item.id,
            owner: item.owner,
            x: Math.round(item.body.position.x * 100) / 100,
            y: Math.round(item.body.position.y * 100) / 100,
            angle: Math.round(item.body.angle * 1000) / 1000,
            vx: Math.round(item.body.velocity.x * 1000) / 1000,
            vy: Math.round(item.body.velocity.y * 1000) / 1000,
            settled: item.isSettled,
            cellIndex: item.isSettled ? item.currentCellIndex : null,
        }));
        return {
            timestamp: Date.now(),
            tokens,
            gridClaimedState: this.cells.map((c) => c.claimedBy),
            gravity: { ...this.gravityVector },
        };
    }
    /**
     * Get logical cell boundaries
     */
    getCells() {
        return JSON.parse(JSON.stringify(this.cells));
    }
    /**
     * Resets the physics world for a new match
     */
    reset() {
        for (const [_, item] of this.tokenMap) {
            World.remove(this.world, item.body);
        }
        this.tokenMap.clear();
        this.setGravity(shared_1.DEFAULT_GRAVITY_VECTOR, shared_1.DEFAULT_GRAVITY_SCALE);
        this.initCells();
    }
}
exports.ServerPhysicsEngine = ServerPhysicsEngine;
