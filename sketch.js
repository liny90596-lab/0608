let gameState = 'START'; // 目前的遊戲狀態
let earringBtn, shockBtn, knockBtn; // 三個遊戲按鈕
let stars = []; // 用於存放星點資料

function setup() {
  // 將畫布設定為視窗大小以填滿頁面
  createCanvas(windowWidth, windowHeight);

  // 初始化星點
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(2, 5), // 像素點大小
      speed: random(0.5, 3) // 移動速度
    });
  }

  // 注入 CSS 像素閃爍動畫
  let style = createElement('style', `
    @keyframes pixel-flash {
      0% { background-color: #e74c3c; color: white; }
      50% { background-color: #f1c40f; color: black; }
    }
    .pixel-btn:hover {
      animation: pixel-flash 0.15s steps(1) infinite;
      cursor: pointer;
    }
  `);

  // 建立三個按鈕
  earringBtn = createButton('變變耳環');
  shockBtn = createButton('電流急急棒');
  knockBtn = createButton('擊倒木頭');

  let buttons = [earringBtn, shockBtn, knockBtn];

  // 統一套用 CSS 樣式
  for (let btn of buttons) {
    btn.class('pixel-btn');
    btn.style('padding', '12px 30px');
    btn.style('font-size', '20px');
    btn.style('font-family', '"Courier New", Courier, monospace');
    btn.style('background-color', '#e74c3c');
    btn.style('color', 'white');
    btn.style('border', '4px solid #000');
    btn.style('border-radius', '0px');
    btn.style('cursor', 'pointer');
    btn.style('box-shadow', '6px 6px 0px rgba(0,0,0,0.8)');
  }

  // 分別綁定點擊事件，傳入不同的遊戲類型
  earringBtn.mousePressed(() => startGame('EARRING'));
  shockBtn.mousePressed(() => startGame('SHOCK'));
  knockBtn.mousePressed(() => startGame('KNOCK'));

  // 置中按鈕位置
  centerButtons();
}

function draw() {
  if (gameState === 'START') {
    drawStartScreen();
  } else if (gameState === 'EARRING') {
    drawEarringGame(); // 進入資料夾2的內容
  } else if (gameState === 'SHOCK') {
    drawShockGame();   // 進入資料夾1的內容
  } else if (gameState === 'KNOCK') {
    drawKnockGame();   // 進入資料夾3的內容
  }
}

function drawStartScreen() {
  background(30, 30, 45); // 深紫色調背景

  // 繪製並更新像素星空
  noStroke();
  fill(255, 255, 255, 200); // 帶點透明度的白色
  for (let star of stars) {
    rect(star.x, star.y, star.size, star.size); // 使用矩形維持像素感
    star.y += star.speed; // 星星向下移動

    // 如果星星超出螢幕底端，則回到頂端重新開始
    if (star.y > height) {
      star.y = -star.size;
      star.x = random(width);
    }
  }

  textAlign(CENTER, CENTER);
  
  // 繪製像素風格標題
  textFont('Courier New');
  textStyle(BOLD);
  fill(255);
  textSize(48);
  text('MY PIXEL GAME', width / 2, height / 2 - 120);
}

// --- 各個遊戲畫面的繪製函式 ---

function drawShockGame() {
  background(50, 100, 150); // 電流急急棒背景
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(32);
  text('⚡ 電流急急棒 ⚡\n(資料夾 1 內容)', width / 2, height / 2);
}

function drawEarringGame() {
  background(150, 50, 100); // 變變耳環背景
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(32);
  text('✨ 變變耳環 ✨\n(資料夾 2 內容)', width / 2, height / 2);
}

function drawKnockGame() {
  background(100, 150, 50); // 擊倒木頭背景
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(32);
  text('🪵 擊倒木頭 🪵\n(資料夾 3 內容)', width / 2, height / 2);
}

function startGame(type) {
  if (type === 'SHOCK') {
    // 按下電流急急棒，跳轉到 01 資料夾
    window.location.href = './01/index.html';
  } else if (type === 'EARRING') {
    // 按下變變耳環，跳轉到 02 資料夾
    window.location.href = './02/index.html';
  } else if (type === 'KNOCK') {
    // 按下擊倒木頭，跳轉到 03 資料夾
    window.location.href = './03/index.html';
  }
}

function windowResized() {
  // 當視窗大小改變時，重新調整畫布大小並重新置中按鈕
  resizeCanvas(windowWidth, windowHeight);
  centerButtons();
}

function centerButtons() {
  let buttons = [earringBtn, shockBtn, knockBtn];
  let startY = height / 2 - 20; // 第一個按鈕的起始高度
  let spacing = 80;             // 按鈕之間的間距

  buttons.forEach((btn, index) => {
    // 設定每個按鈕的位置，水平置中，垂直依序排列
    btn.position(width / 2 - btn.elt.offsetWidth / 2, startY + index * spacing);
  });
}
