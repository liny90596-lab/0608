let capture;
let handPose;
let hands = [];
let gameState = "WAITING"; // WAITING, PLAYING, WON, LOST, GAME_OVER
let mazePath = [];
let lives = 3;
let pathWidth = 60;
let buzz; // 宣告振盪器用於音效
let retryBtn, homeBtn; // 宣告按鈕變數
let hitCooldown = 0; // 新增碰撞冷卻時間，防止瞬間扣完所有命
let startTime = 0;
let elapsedTime = 0;

function preload() {
  // 初始化 handPose 模型
  handPose = ml5.handPose();
}

function setup() {
  // 建立與視窗大小相同的畫布
  createCanvas(windowWidth, windowHeight);
  
  // 擷取攝影機影像
  capture = createCapture(VIDEO);
  // 隱藏預設產生的 HTML video 元件，只在畫布上顯示
  capture.hide();

  // 初始化音效回饋 (振盪器)
  buzz = new p5.Oscillator('sawtooth');
  buzz.freq(100); // 設定為低頻
  buzz.amp(0);   // 預設靜音
  buzz.start();

  // 定義迷宮路徑點 (相對於 displayWidth/displayHeight 的座標)
  // 這裡座標是在 translate(width/2, height/2) 之後的系統中
  // 座標範圍大約在 -dW/2 到 dW/2 之間
  mazePath = [
    { x: 0.4, y: 0.35 },  // 起點 (螢幕左側)
    { x: 0.4, y: -0.2 },
    { x: 0.1, y: -0.2 },
    { x: 0.1, y: 0.2 },
    { x: -0.4, y: 0.2 },
    { x: -0.4, y: -0.35 } // 終點 (螢幕右側)
  ];

  // 開始偵測手部
  handPose.detectStart(capture, gotHands);

  // 建立「再來一次」按鈕
  retryBtn = createButton('再來一次');
  retryBtn.mousePressed(resetGame);
  retryBtn.style('font-size', '20px');
  retryBtn.style('padding', '10px 20px');
  retryBtn.hide(); // 預設隱藏

  // 建立「回首頁」按鈕
  homeBtn = createButton('回首頁');
  homeBtn.mousePressed(goHome);
  homeBtn.style('font-size', '20px');
  homeBtn.style('padding', '10px 20px');
  homeBtn.hide(); // 預設隱藏
  
  positionButtons();
}

function gotHands(results) {
  hands = results;
}

function draw() {
  background(220);
  
  // 計算顯示影像的寬高（全螢幕畫面的 80%）
  let displayWidth = windowWidth * 0.8;
  let displayHeight = windowHeight * 0.8;
  
  push();
  // 將座標系原點移至畫面中心
  translate(width / 2, height / 2);
  // 實作左右顛倒：在 X 軸縮放 -1 倍
  scale(-1, 1);
  
  // 設定影像繪製模式為中心
  imageMode(CENTER);
  // 繪製影像，因為已經 translate 到中心，所以座標填 (0, 0)
  tint(255, 150); // 稍微讓背景變暗，看清楚遊戲路徑
  image(capture, 0, 0, displayWidth, displayHeight);
  noTint();

  // 繪製遊戲路徑 (急急棒軌道)
  drawMaze(displayWidth, displayHeight);

  // 繪製手部連線
  if (hands.length > 0) {
    checkGameLogic(displayWidth, displayHeight);
  }

  // 顯示文字資訊
  drawUI();
  drawLives(displayWidth, displayHeight);
  drawTimer();

  // 遊戲結束時繪製半透明遮罩
  if (gameState === "GAME_OVER") {
    drawGameOverOverlay();
  }
  
  pop();
}

function drawMaze(dW, dH) {
  noFill();
  stroke(255, 200); // 白色半透明路徑
  strokeWeight(pathWidth);
  strokeJoin(ROUND);
  strokeCap(ROUND);
  
  beginShape();
  for (let p of mazePath) {
    vertex(p.x * dW, p.y * dH);
  }
  endShape();

  // 繪製起點與終點
  let sX = mazePath[0].x * dW;
  let sY = mazePath[0].y * dH;
  let eX = mazePath[mazePath.length - 1].x * dW;
  let eY = mazePath[mazePath.length - 1].y * dH;
  
  fill(0, 255, 0, 150); // 起點：綠色
  noStroke();
  circle(sX, sY, pathWidth);
  
  fill(255, 255, 0, 150); // 終點：黃色
  circle(eX, eY, pathWidth);

  // 標示文字 (需反轉回來才可閱讀)
  fill(255);
  textSize(20);
  textAlign(CENTER, CENTER);
  
  push();
  translate(sX, sY);
  scale(-1, 1);
  text("START", 0, pathWidth * 0.8);
  pop();

  push();
  translate(eX, eY);
  scale(-1, 1);
  text("END", 0, pathWidth * 0.8);
  pop();
}

function drawGameOverOverlay() {
  // 繪製全黑透明遮罩 (在鏡像座標系中)
  rectMode(CORNER);
  fill(0, 180);
  // 覆蓋整個畫布範圍
  rect(-width, -height, width * 2, height * 2);
}

function drawTimer() {
  if (gameState === "PLAYING") {
    elapsedTime = (millis() - startTime) / 1000;
  }
  push();
  scale(-1, 1);
  fill(255);
  textAlign(RIGHT, TOP);
  textSize(30);
  let timeStr = nf(elapsedTime, 1, 2) + "s";
  // 放置在整個畫布 (頁面) 的右上角，並加一點邊距 (20px)
  text(timeStr, width / 2 - 20, -height / 2 + 20);
  pop();
}

function drawUI() {
  // 因為有 scale(-1, 1)，文字需要翻轉回來才正常
  push();
  scale(-1, 1);
  fill(255);
  textSize(32);
  textAlign(CENTER);
  
  let msg = "";
  if (gameState === "WAITING") msg = "Move Red Dot to Green Circle to Start";
  if (gameState === "PLAYING") msg = "Don't touch the walls!";
  
  if (gameState === "GAME_OVER" || gameState === "WON") {
    retryBtn.show();
    homeBtn.show();
    if (gameState === "GAME_OVER") {
      fill(255, 0, 0);
      msg = "ALL LIVES LOST!";
    } else {
      fill(0, 255, 0);
      msg = "YOU WIN! Time: " + nf(elapsedTime, 1, 2) + "s";
    }
  } else {
    retryBtn.hide();
    homeBtn.hide();
  }
  text(msg, 0, -height * 0.45);
  pop();
}

function drawLives(dW, dH) {
  push();
  scale(-1, 1); // 反轉鏡像，讓愛心從左往右排
  fill(255);    // 確保愛心（文字）顏色為白色
  textAlign(LEFT, TOP);
  textSize(30);
  let heartStr = "";
  for (let i = 0; i < lives; i++) {
    heartStr += "❤️ ";
  }
  // 放置在整個畫布 (頁面) 的左上角，並加一點邊距 (20px)
  text(heartStr, -width / 2 + 20, -height / 2 + 20);
  pop();
}

function drawHandLines(dW, dH) {
  // 確保攝影機影像已經載入，避免 map 運算出現 NaN
  if (capture.width === 0 || capture.height === 0) {
    return;
  }

  for (let hand of hands) {
    let points = hand.keypoints;
    
    // 定義需要串接的線段群組
    let segments = [[0, 4], [5, 8], [9, 12], [13, 16], [17, 20]];
    
    stroke(0, 255, 0); // 線條顏色：綠色
    strokeWeight(3);
    
    for (let seg of segments) {
      for (let i = seg[0]; i < seg[1]; i++) {
        let pt1 = points[i];
        let pt2 = points[i + 1];
        
        // 將原始影片座標對應到畫布上的顯示座標 (80% 大小且置中)
        let x1 = map(pt1.x, 0, capture.width, -dW / 2, dW / 2);
        let y1 = map(pt1.y, 0, capture.height, -dH / 2, dH / 2);
        let x2 = map(pt2.x, 0, capture.width, -dW / 2, dW / 2);
        let y2 = map(pt2.y, 0, capture.height, -dH / 2, dH / 2);
        
        line(x1, y1, x2, y2);
      }
    }

    // 在食指指尖（編號 8）增加一個紅點
    let indexTip = points[8];
    let ix = map(indexTip.x, 0, capture.width, -dW / 2, dW / 2);
    let iy = map(indexTip.y, 0, capture.height, -dH / 2, dH / 2);
    
    // 如果在冷卻時間內，讓紅點閃爍
    if (millis() < hitCooldown && Math.floor(millis() / 200) % 2 === 0) {
      fill(255, 0, 0, 50); // 半透明紅色
    } else {
      fill(255, 0, 0); // 正常紅色
    }
    noStroke();      // 紅點不加邊框
    circle(ix, iy, 30);
    
    return { x: ix, y: iy };
  }
  return null;
}

function checkGameLogic(dW, dH) {
  let tip = drawHandLines(dW, dH);
  if (!tip) return;

  let startPos = { x: mazePath[0].x * dW, y: mazePath[0].y * dH };
  let endPos = { x: mazePath[mazePath.length - 1].x * dW, y: mazePath[mazePath.length - 1].y * dH };

  // 檢查是否在起點
  if (dist(tip.x, tip.y, startPos.x, startPos.y) < pathWidth / 2) {
    if (gameState === "GAME_OVER" || gameState === "WON") {
      // 重置遊戲
      lives = 3;
      elapsedTime = 0;
      hitCooldown = 0;
      retryBtn.hide();
      homeBtn.hide();
    }
    if (gameState !== "PLAYING") {
      // 確保瀏覽器的音訊上下文在使用者互動後啟動
      userStartAudio();
      startTime = millis();
    }
    gameState = "PLAYING";
  }

  if (gameState === "PLAYING") {
    // 檢查是否到達終點
    if (dist(tip.x, tip.y, endPos.x, endPos.y) < pathWidth / 2) {
      elapsedTime = (millis() - startTime) / 1000;
      gameState = "WON";
    }

    // 檢查碰撞：計算點到所有路徑段的最近距離
    let onPath = false;
    for (let i = 0; i < mazePath.length - 1; i++) {
      let p1 = { x: mazePath[i].x * dW, y: mazePath[i].y * dH };
      let p2 = { x: mazePath[i + 1].x * dW, y: mazePath[i + 1].y * dH };
      let d = distToSegment(tip, p1, p2);
      if (d < pathWidth / 2) {
        onPath = true;
        break;
      }
    }

    // 檢查碰撞：若不在路徑上且已過冷卻時間
    if (!onPath && gameState === "PLAYING" && millis() > hitCooldown) {
        triggerFeedback();
        lives--;
        if (lives <= 0) {
          gameState = "GAME_OVER";
        } else {
          hitCooldown = millis() + 1000; // 設定 1 秒冷卻時間，不切換狀態，直接繼續
        }
    }
  }
}

// 觸發震動與音效的函式
function triggerFeedback() {
  // 1. 音效回饋：短暫發出 0.2 秒的聲音
  buzz.amp(0.5, 0.05); // 0.05秒內將音量調至0.5
  buzz.amp(0, 0.2, 0.1); // 0.1秒後開始，在0.2秒內淡出
  
  // 2. 震動回饋：持續 200 毫秒 (僅支援行動裝置)
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(200);
  }
}

// 計算點到線段的距離
function distToSegment(p, v, w) {
  let l2 = Math.pow(dist(v.x, v.y, w.x, w.y), 2);
  if (l2 == 0) return dist(p.x, p.y, v.x, v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
}

// 重置遊戲邏輯
function resetGame() {
  lives = 3;
  gameState = "WAITING";
  elapsedTime = 0;
  elapsedTime = 0;
  hitCooldown = 0;
  retryBtn.hide();
  homeBtn.hide();
}

// 回首頁邏輯 (在此專案中等同於重置)
function goHome() {
  window.location.href = '../index.html';
}

// 設定按鈕位置
function positionButtons() {
  retryBtn.position(width / 2 - 120, height / 2);
  homeBtn.position(width / 2 + 20, height / 2);
}

function windowResized() {
  // 當視窗縮放時，自動調整畫布大小
  resizeCanvas(windowWidth, windowHeight);
  positionButtons();
}