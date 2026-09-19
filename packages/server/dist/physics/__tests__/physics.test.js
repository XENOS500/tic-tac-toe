"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ServerPhysicsEngine_1 = require("../ServerPhysicsEngine");
const shared_1 = require("@anti-gravity/shared");
(0, vitest_1.describe)('ServerPhysicsEngine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new ServerPhysicsEngine_1.ServerPhysicsEngine();
    });
    (0, vitest_1.it)('initializes 9 canonical cells with correct center coordinates', () => {
        const cells = engine.getCells();
        (0, vitest_1.expect)(cells).toHaveLength(9);
        (0, vitest_1.expect)(cells[0].center.x).toBe(shared_1.COL_CENTERS[0]);
        (0, vitest_1.expect)(cells[0].center.y).toBe(shared_1.ROW_CENTERS[0]);
        (0, vitest_1.expect)(cells[0].claimedBy).toBeNull();
        (0, vitest_1.expect)(cells[4].center.x).toBe(shared_1.COL_CENTERS[1]);
        (0, vitest_1.expect)(cells[4].center.y).toBe(shared_1.ROW_CENTERS[1]);
        (0, vitest_1.expect)(cells[8].center.x).toBe(shared_1.COL_CENTERS[2]);
        (0, vitest_1.expect)(cells[8].center.y).toBe(shared_1.ROW_CENTERS[2]);
    });
    (0, vitest_1.it)('spawns X and O tokens with distinct physical properties', () => {
        const tokenX = engine.addToken('X', 0);
        (0, vitest_1.expect)(tokenX.owner).toBe('X');
        (0, vitest_1.expect)(tokenX.mass).toBeGreaterThan(2);
        const tokenO = engine.addToken('O', 1);
        (0, vitest_1.expect)(tokenO.owner).toBe('O');
        (0, vitest_1.expect)(tokenO.mass).toBeLessThan(tokenX.mass);
        const snapshot = engine.getSnapshot();
        (0, vitest_1.expect)(snapshot.tokens).toHaveLength(2);
    });
    (0, vitest_1.it)('supports rotating gravity vectors', () => {
        const { newVector } = engine.rotateGravity(90);
        (0, vitest_1.expect)(Math.abs(newVector.x - 1)).toBeLessThan(0.01);
        (0, vitest_1.expect)(Math.abs(newVector.y)).toBeLessThan(0.01);
    });
    (0, vitest_1.it)('simulates physics steps and settles tokens inside cells', () => {
        engine.addToken('X', 1);
        for (let i = 0; i < 250; i++) {
            engine.step(16.66);
        }
        const snapshot = engine.getSnapshot();
        (0, vitest_1.expect)(snapshot.tokens.length).toBe(1);
        const token = snapshot.tokens[0];
        (0, vitest_1.expect)(token.settled).toBe(true);
        (0, vitest_1.expect)(token.cellIndex).toBe(1);
        (0, vitest_1.expect)(snapshot.gridClaimedState[1]).toBe('X');
    });
    (0, vitest_1.it)('evaluates horizontal 3-in-a-row win condition', () => {
        engine.addToken('X', 0);
        engine.addToken('X', 1);
        engine.addToken('X', 2);
        for (let i = 0; i < 280; i++) {
            engine.step(16.66);
        }
        const status = engine.checkBoardStatus();
        (0, vitest_1.expect)(status.matrix[0]).toBe('X');
        (0, vitest_1.expect)(status.matrix[1]).toBe('X');
        (0, vitest_1.expect)(status.matrix[2]).toBe('X');
        (0, vitest_1.expect)(status.winner).toBe('X');
        (0, vitest_1.expect)(status.winningLine).toEqual([0, 1, 2]);
    });
    (0, vitest_1.it)('evaluates vertical 3-in-a-row win when 3 tokens stack in one column', () => {
        engine.addToken('O', 0);
        for (let i = 0; i < 250; i++)
            engine.step(16.66);
        engine.addToken('O', 0);
        for (let i = 0; i < 250; i++)
            engine.step(16.66);
        engine.addToken('O', 0);
        for (let i = 0; i < 350; i++)
            engine.step(16.66);
        const status = engine.checkBoardStatus();
        (0, vitest_1.expect)(status.matrix[0]).toBe('O');
        (0, vitest_1.expect)(status.matrix[3]).toBe('O');
        (0, vitest_1.expect)(status.matrix[6]).toBe('O');
        (0, vitest_1.expect)(status.winner).toBe('O');
        (0, vitest_1.expect)(status.winningLine).toEqual([0, 3, 6]);
    });
    (0, vitest_1.it)('cleans up and resets world state properly', () => {
        engine.addToken('X', 0);
        engine.addToken('O', 1);
        (0, vitest_1.expect)(engine.getSnapshot().tokens).toHaveLength(2);
        engine.reset();
        (0, vitest_1.expect)(engine.getSnapshot().tokens).toHaveLength(0);
        (0, vitest_1.expect)(engine.checkBoardStatus().matrix.every((c) => c === null)).toBe(true);
    });
});
