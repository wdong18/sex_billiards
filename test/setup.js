/**
 * Jest 测试环境设置
 * 模拟 Matter.js 和 DOM 环境
 */

// 模拟 Matter.js
global.Matter = {
    Engine: {
        create: (options) => {
            const engine = {
                world: {
                    gravity: { y: 0 },
                    bodies: []
                },
                enableSleeping: options?.enableSleeping || false
            };
            return engine;
        },
        run: () => {}
    },
    Render: {
        create: (options) => {
            const canvas = options.canvas || document.createElement('canvas');
            const context = canvas.getContext('2d') || {
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                fillStyle: '',
                strokeStyle: '',
                font: '',
                textAlign: '',
                fillText: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                rotate: () => {},
                clearRect: () => {}
            };
            
            return {
                canvas: canvas,
                context: context,
                options: options.options || {}
            };
        },
        run: () => {},
        world: () => {}
    },
    World: {
        add: (world, bodies) => {
            if (!Array.isArray(bodies)) {
                bodies = [bodies];
            }
            if (!world.bodies) {
                world.bodies = [];
            }
            world.bodies.push(...bodies);
        },
        remove: (world, body) => {
            if (world.bodies) {
                const index = world.bodies.indexOf(body);
                if (index > -1) {
                    world.bodies.splice(index, 1);
                }
            }
        }
    },
    Bodies: {
        circle: (x, y, radius, options = {}) => {
            return {
                position: { x, y },
                circleRadius: radius,
                render: options.render || {},
                label: options.label || 'ball',
                restitution: options.restitution || 0.8,
                friction: options.friction || 0.1,
                frictionAir: options.frictionAir || 0.01,
                density: options.density || 0.001,
                velocity: { x: 0, y: 0 },
                ballNumber: options.ballNumber !== undefined ? options.ballNumber : null // 用于存储球的号码
            };
        },
        rectangle: (x, y, width, height, options = {}) => {
            return {
                position: { x, y },
                render: options.render || {},
                label: options.label || 'wall',
                isStatic: options.isStatic || false,
                isSensor: options.isSensor || false
            };
        }
    },
    Body: {
        applyForce: () => {}
    },
    Events: {
        on: () => {}
    },
    Vector: {
        magnitude: (v) => {
            return Math.sqrt(v.x * v.x + v.y * v.y);
        }
    }
};

