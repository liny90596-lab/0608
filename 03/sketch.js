let capture;
let handPose;
let hands = [];

// Matter.js 變數
const { Engine, World, Bodies, Body, Composite } = Matter;
let engine;
let world;
let ground, ball;
let boxes = [];
let slingPos;
let ballTrail = []; // 新增：儲存球的飛行路徑點
let isDragging = false;
let canShoot = true;
let isGameOver = false; // 新增：追蹤遊戲是否結束
let playAgainBtn, backToHomeBtn; // 新增：按鈕變數
let fallenCount = 0; // 新增：追蹤倒下的木塊數量

function preload() {
  // 載入手部追蹤模型
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 擷取攝影機影像
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  // 隱藏預設產生的 HTML 影片元件，只在畫布上顯示
  capture.hide();

  // 初始化物理引擎
  engine = Engine.create();
  world = engine.world;

  // 建立「再玩一次」按鈕
  playAgainBtn = createButton('再玩一次');
  playAgainBtn.style('font-size', '20px');
  playAgainBtn.style('padding', '10px 20px');
  playAgainBtn.mousePressed(resetGame);
  playAgainBtn.hide();

  // 建立「回首頁」按鈕
  backToHomeBtn = createButton('回首頁');
  backToHomeBtn.style('font-size', '20px');
  backToHomeBtn.style('padding', '10px 20px');
  backToHomeBtn.mousePressed(() => { window.location.href = '../index.html'; }); 
  backToHomeBtn.hide();

  // 初始化遊戲物件
  resetGame();

  // 開始偵測手部
  handPose.detectStart(capture, (results) => {
    hands = results;
  });
}

function resetGame() {
  World.clear(world);
  boxes = [];
  isGameOver = false;
  fallenCount = 0; // 重置計數
  
  // 隱藏按鈕
  if (playAgainBtn) playAgainBtn.hide();
  if (backToHomeBtn) backToHomeBtn.hide();
  
  let w = windowWidth * 0.8;
  let h = windowHeight * 0.8;
  let xOffset = (windowWidth - w) / 2;
  let yOffset = (windowHeight - h) / 2;

  // 地面
  ground = Bodies.rectangle(windowWidth / 2, yOffset + h - 10, w, 20, { isStatic: true });
  
  // 彈弓位置 (左側)
  slingPos = { x: xOffset + w * 0.2, y: yOffset + h * 0.7 };
  
  // 木頭建築 (右側堆疊)
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      let box = Bodies.rectangle(xOffset + w * 0.7 + j * 40, yOffset + h - 50 - i * 50, 30, 45);
      boxes.push(box);
    }
  }

  // 建立球
  ball = Bodies.circle(slingPos.x, slingPos.y, 15, { density: 0.002, frictionAir: 0.01 });
  Body.setStatic(ball, true); // 初始靜止

  ballTrail = []; // 重置軌跡
  World.add(world, [ground, ball, ...boxes]);
}

function draw() {
  background(220);
  Engine.update(engine);

  let w = windowWidth * 0.8;
  let h = windowHeight * 0.8;
  let x = (windowWidth - w) / 2;
  let y = (windowHeight - h) / 2;

  // --- 繪製背景與攝影機影像 ---
  push();
  translate(x + w, y);
  scale(-1, 1);
  image(capture, 0, 0, w, h);
  drawHandLines(w, h);
  pop();

  // --- 遊戲邏輯與繪製 ---
  drawPhysicsObjects();
  handleHandInteraction(x, y, w, h);

  // 檢查是否打倒建築
  checkGameOver(y + h);

  // --- 顯示統計資訊 ---
  fill(0);
  textSize(24);
  textAlign(LEFT, TOP);
  text(`倒下的木塊: ${fallenCount} / ${boxes.length}`, x + 10, y + 10);

  // 更新按鈕位置（隨視窗調整）
  playAgainBtn.position(windowWidth / 2 - 110, windowHeight / 2);
  backToHomeBtn.position(windowWidth / 2 + 10, windowHeight / 2);

  // 更新軌跡紀錄
  if (!canShoot && !isDragging) {
    ballTrail.push({ x: ball.position.x, y: ball.position.y });
    if (ballTrail.length > 30) ballTrail.shift(); // 只保留最近 30 個點
  }

  // 顯示提示
  fill(0);
  noStroke();
  textAlign(CENTER);
  text("使用拇指與食指捏住球來拉動彈弓，放開即發射。按下 'R' 重置遊戲。", windowWidth / 2, y - 20);
}

function drawPhysicsObjects() {
  // 畫地面
  fill(100);
  rectMode(CENTER);
  rect(ground.position.x, ground.position.y, windowWidth * 0.8, 20);

  if (isGameOver) {
    fill(0, 150);
    rect(windowWidth/2, windowHeight/2, windowWidth, windowHeight); // 結算背景
    fill(255);
    textSize(48);
    text("建築已倒塌！", windowWidth / 2, windowHeight / 2 - 80);
  }

  // 畫飛行軌跡點
  noStroke();
  fill(255, 100, 100, 150); // 半透明紅色
  for (let i = 0; i < ballTrail.length; i++) {
    ellipse(ballTrail[i].x, ballTrail[i].y, 5 + i/2); // 越後面的點越小
  }

  // 畫木塊
  fill(160, 82, 45);
  stroke(0);
  for (let box of boxes) {
    push();
    translate(box.position.x, box.position.y);
    rotate(box.angle);
    rect(0, 0, 30, 45);
    pop();
  }

  // 畫彈弓線
  strokeWeight(4);
  stroke(50);
  if (isDragging) {
    line(slingPos.x, slingPos.y, ball.position.x, ball.position.y);
  }
  strokeWeight(1);

  // 畫球
  fill(255, 0, 0);
  ellipse(ball.position.x, ball.position.y, 30);
}

function handleHandInteraction(vx, vy, vw, vh) {
  if (hands.length > 0) {
    let hand = hands[0];
    let thumb = hand.keypoints[4];
    let index = hand.keypoints[8];

    // 轉換手部座標至畫面座標 (考慮鏡像)
    let hx = vx + vw - (thumb.x * vw / capture.width);
    let hy = vy + (thumb.y * vh / capture.height);
    let ix = vx + vw - (index.x * vw / capture.width);
    let iy = vy + (index.y * vh / capture.height);

    let pinchX = (hx + ix) / 2;
    let pinchY = (hy + iy) / 2;
    let d = dist(hx, hy, ix, iy);

    // 捏合判定 (距離小於 40)
    if (d < 40) {
      let distToBall = dist(pinchX, pinchY, ball.position.x, ball.position.y);
      if (canShoot && (distToBall < 50 || isDragging)) {
        isDragging = true;
        Body.setPosition(ball, { x: pinchX, y: pinchY });
      }
    } else {
      if (isDragging) {
        // 發射！
        isDragging = false;
        canShoot = false;
        ballTrail = []; // 開始新軌跡
        Body.setStatic(ball, false);
        
        // 計算力道
        let forceX = (slingPos.x - ball.position.x) * 0.005; // 調整發射係數
        let forceY = (slingPos.y - ball.position.y) * 0.005;
        Body.applyForce(ball, ball.position, { x: forceX, y: forceY });
        
        // 3秒後自動重置球
        setTimeout(() => {
          resetBall();
        }, 3000);
      }
    }
  }
}

function resetBall() {
  Body.setStatic(ball, true);
  Body.setPosition(ball, slingPos);
  Body.setVelocity(ball, { x: 0, y: 0 });
  ballTrail = []; // 清空軌跡
  canShoot = true;
}

function checkGameOver(groundLevel) {
  let count = 0;
  for (let box of boxes) {
    // 如果木塊旋轉超過 15 度，或者高度明顯下降（掉到地上），視為倒下
    if (Math.abs(box.angle) > 0.3 || box.position.y > groundLevel - 40) {
      count++;
    }
  }
  fallenCount = count; // 更新全域變數

  // 如果超過一半的木塊倒下了，且球已經發射過
  if (!isGameOver && !canShoot && fallenCount > boxes.length / 2) {
    isGameOver = true;
    playAgainBtn.show();
    backToHomeBtn.show();
  }
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    resetGame();
  }
}

function drawHandLines(targetW, targetH) {
  stroke(0, 255, 0); // 設定線條顏色為綠色
  strokeWeight(3);   // 設定線條寬度

  // 定義連線分組：0-4, 5-8, 9-12, 13-16, 17-20
  const connectionGroups = [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20]
  ];

  for (let hand of hands) {
    for (let group of connectionGroups) {
      for (let i = 0; i < group.length - 1; i++) {
        let p1 = hand.keypoints[group[i]];
        let p2 = hand.keypoints[group[i + 1]];
        
        // 將座標從原始攝影機尺寸對應到目前畫布上的 80% 影像尺寸
        line(
          (p1.x * targetW) / capture.width, (p1.y * targetH) / capture.height,
          (p2.x * targetW) / capture.width, (p2.y * targetH) / capture.height
        );
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
