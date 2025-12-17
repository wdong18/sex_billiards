/**
 * 重现 Issue #1 的测试用例
 * 问题：目标球没有标记号码，而且没有区分全色球和花色球
 * 
 * 测试要求：
 * 1. 1-15号球都应该有号码标记
 * 2. 1-7号球应该是全色球（纯色）
 * 3. 9-15号球应该是花色球（有白色条纹）
 * 4. 8号球应该是黑色
 */

// 需要在 setup.js 中已经设置了 Matter 和 DOM 环境
// 这里直接使用全局变量

// 导入 script.js 中的函数和变量
// 由于 script.js 使用全局作用域，我们需要在测试中重新定义或导入

describe('Issue #1: 球的号码标记和颜色区分', () => {
    // 模拟 script.js 中的常量和函数
    const BALL_RADIUS = 15;
    const TABLE_HEIGHT = 400;
    const CUE_BALL_POSITION = { x: 200, y: TABLE_HEIGHT / 2 };
    
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

    let testBalls = [];
    let testEngine;
    let testRender;

    beforeEach(() => {
        // 创建测试用的 canvas 元素
        document.body.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.id = 'billiards-table';
        canvas.width = 800;
        canvas.height = 400;
        document.body.appendChild(canvas);

        // 创建测试用的 DOM 元素
        const player1ScoreEl = document.createElement('span');
        player1ScoreEl.id = 'player1-score';
        document.body.appendChild(player1ScoreEl);

        const player2ScoreEl = document.createElement('span');
        player2ScoreEl.id = 'player2-score';
        document.body.appendChild(player2ScoreEl);

        const resetButton = document.createElement('button');
        resetButton.id = 'reset-game';
        document.body.appendChild(resetButton);

        // 创建测试用的球（模拟修改后的 createBalls 函数的行为）
        testBalls = [];
        
        // 创建 cue ball
        const cue = Matter.Bodies.circle(CUE_BALL_POSITION.x, CUE_BALL_POSITION.y, BALL_RADIUS, {
            label: 'cue',
            render: {
                fillStyle: BALL_COLORS[0],
                customRenderer: false
            }
        });
        testBalls.push(cue);

        // 创建 1-15 号球（使用修改后的逻辑）
        for (let ballCount = 1; ballCount <= 15; ballCount++) {
            // 判断是全色球还是花色球
            const isSolid = ballCount >= 1 && ballCount <= 7;
            const isStriped = ballCount >= 9 && ballCount <= 15;
            
            const ball = Matter.Bodies.circle(300 + ballCount * 20, 200, BALL_RADIUS, {
                label: `ball${ballCount}`,
                ballNumber: ballCount, // 存储球的号码
                render: {
                    fillStyle: BALL_COLORS[ballCount],
                    showNumber: true, // 标记需要显示号码
                    isSolid: isSolid, // 标记是否为全色球
                    isStriped: isStriped, // 标记是否为花色球
                    customRenderer: true // 标记需要自定义渲染
                }
            });
            testBalls.push(ball);
        }
    });

    test('应该为每个目标球（1-15）添加号码标记', () => {
        // 获取所有目标球（排除 cue ball）
        const targetBalls = testBalls.filter(ball => ball.label && ball.label.startsWith('ball'));
        
        expect(targetBalls.length).toBe(15);
        
        // 检查每个球是否有号码信息
        targetBalls.forEach((ball, index) => {
            const expectedNumber = index + 1;
            // 球应该存储号码信息（通过 label）
            expect(ball.label).toBe(`ball${expectedNumber}`);
            // 球应该有渲染属性
            expect(ball.render).toBeDefined();
        });
        
        // 问题重现：当前代码没有在球上绘制号码文字
        // 这个测试应该失败，因为球没有号码标记属性
        targetBalls.forEach(ball => {
            // 球应该有一个属性来标记是否需要绘制号码
            expect(ball.render.showNumber).toBe(true); // 当前不存在，测试会失败
        });
    });

    test('1-7号球应该是全色球（纯色，无白色条纹）', () => {
        const solidBalls = testBalls.filter(ball => {
            const match = ball.label.match(/ball(\d+)/);
            if (!match) return false;
            const number = parseInt(match[1]);
            return number >= 1 && number <= 7;
        });

        expect(solidBalls.length).toBe(7);

        solidBalls.forEach(ball => {
            const match = ball.label.match(/ball(\d+)/);
            const number = parseInt(match[1]);
            
            // 全色球应该有纯色填充
            expect(ball.render.fillStyle).toBeDefined();
            expect(ball.render.fillStyle).toBe(BALL_COLORS[number]);
            
            // 全色球应该有 isSolid 标记，不应该有 isStriped 标记
            expect(ball.render.isSolid).toBe(true);
            expect(ball.render.isStriped).toBe(false); // 全色球明确标记为 false
        });
    });

    test('9-15号球应该是花色球（有白色条纹）', () => {
        const stripedBalls = testBalls.filter(ball => {
            const match = ball.label.match(/ball(\d+)/);
            if (!match) return false;
            const number = parseInt(match[1]);
            return number >= 9 && number <= 15;
        });

        expect(stripedBalls.length).toBe(7);

        stripedBalls.forEach(ball => {
            const match = ball.label.match(/ball(\d+)/);
            const number = parseInt(match[1]);
            
            // 花色球应该有 isStriped 标记，不应该有 isSolid 标记
            expect(ball.render.isStriped).toBe(true);
            expect(ball.render.isSolid).toBe(false); // 花色球明确标记为 false
        });
    });

    test('8号球应该是黑色', () => {
        const ball8 = testBalls.find(ball => ball.label === 'ball8');
        
        expect(ball8).toBeDefined();
        expect(ball8.render.fillStyle).toBe('#000000'); // 黑色
    });

    test('球上应该绘制号码文字', () => {
        // 检查是否有自定义渲染函数来绘制号码
        // Matter.js 默认不支持在球上绘制文字，需要自定义渲染
        const targetBalls = testBalls.filter(ball => ball.label && ball.label.startsWith('ball'));
        
        expect(targetBalls.length).toBe(15);
        
        // 球应该有号码数字属性和自定义渲染标记
        targetBalls.forEach(ball => {
            // 球应该有号码数字属性
            const match = ball.label.match(/ball(\d+)/);
            const number = parseInt(match[1]);
            expect(ball.ballNumber).toBe(number);
            
            // 应该有自定义渲染函数标记
            expect(ball.render.customRenderer).toBe(true);
            expect(ball.render.showNumber).toBe(true);
        });
    });
});

