let capture;
let faceMesh;
let handPose;
let faces = [];
let hands = [];
let earringImages = []; // 儲存 5 種耳環圖片
let faceOverlayImage; // 新增：臉部覆蓋圖片
let currentEarringIndex = 0; // 當前使用的耳環索引 (0-4)
let earringSize = 40; // 耳環顯示大小
let faceSize = 150; // 新增：臉部圖片顯示大小
let homeBtn; // 回首頁按鈕

function preload() {
  // 載入 ml5.faceMesh 模型
  faceMesh = ml5.faceMesh();
  // 載入 ml5.handPose 模型
  handPose = ml5.handPose();

  // 預載入 5 種耳環圖片
  earringImages[0] = loadImage('pic/acc1_ring.png');
  earringImages[1] = loadImage('pic/acc2_pearl.png');
  earringImages[2] = loadImage('pic/acc3_tassel.png');
  earringImages[3] = loadImage('pic/acc4_jade.png');
  earringImages[4] = loadImage('pic/acc5_phoenix.png');
  // 載入臉部覆蓋圖片
  faceOverlayImage = loadImage('pic/4379901.png', () => {
    console.log('faceOverlayImage loaded successfully.');
  }, (err) => {
    console.error('Failed to load faceOverlayImage:', err);
  });
}

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  // 擷取攝影機影像
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  // 隱藏預設產生的 HTML 影片元件，只在畫布上繪製
  capture.hide();

  // 開始偵測臉部特徵點
  faceMesh.detectStart(capture, gotFaces);
  // 開始偵測手部特徵點
  handPose.detectStart(capture, gotHands);

  // 建立「回首頁」按鈕
  homeBtn = createButton('回首頁');
  homeBtn.position(20, 20);
  homeBtn.style('font-size', '18px');
  homeBtn.style('padding', '10px 15px');
  homeBtn.style('cursor', 'pointer');
  homeBtn.mousePressed(() => { window.location.href = '../index.html'; });
}

function draw() {
  // 設定背景顏色
  background('#e7c6ff');

  let w = width * 0.8;
  let h = height * 0.8;
  
  // 計算縮放比例，確保臉譜與耳環隨影像大小同步縮放
  let displayScale = w / capture.width;

  push();
  // 將原點移至畫布中心
  translate(width / 2, height / 2);
  // 水平翻轉影像（左右顛倒）
  scale(-1, 1);
  // 以中心點模式繪製影像
  imageMode(CENTER);
  image(capture, 0, 0, w, h);

  // 手勢辨識邏輯：計算伸出的手指數量
  if (hands.length > 0) {
    let hand = hands[0];
    let count = 0;

    // 簡單的判斷邏輯：如果指尖 (Tip) 比第二關節 (Pip) 高 (Y座標較小)，則視為伸出
    // 食指: 8 vs 6, 中指: 12 vs 10, 無名指: 16 vs 14, 小指: 20 vs 18
    if (hand.keypoints[8].y < hand.keypoints[6].y) count++;
    if (hand.keypoints[12].y < hand.keypoints[10].y) count++;
    if (hand.keypoints[16].y < hand.keypoints[14].y) count++;
    if (hand.keypoints[20].y < hand.keypoints[18].y) count++;

    // 大拇指邏輯：判斷水平距離或與掌心的距離
    let thumbTip = hand.keypoints[4];
    let thumbBase = hand.keypoints[2];
    let palm = hand.keypoints[0];
    if (dist(thumbTip.x, thumbTip.y, palm.x, palm.y) > dist(thumbBase.x, thumbBase.y, palm.x, palm.y)) {
      count++;
    }

    // 如果手指數量在 1-5 之間，更新目前耳環
    if (count >= 1 && count <= 5) {
      currentEarringIndex = count - 1;
    }
  }

  // 如果偵測到臉部，繪製耳垂位置的黃色圓圈
  if (faces.length > 0) {
    let face = faces[0];
    
    // 繪製臉部覆蓋圖片 (以鼻尖索引 1 為中心)
    let noseTip = face.keypoints[1];
    if (noseTip) {
      let nx = map(noseTip.x, 0, capture.width, -w / 2, w / 2);
      let ny = map(noseTip.y, 0, capture.height, -h / 2, h / 2);
      
      // 在鼻尖位置顯示新圖片
      image(faceOverlayImage, nx, ny, faceSize * displayScale, faceSize * displayScale);
    }

    // MediaPipe FaceMesh 索引：234 為右耳區域, 454 為左耳區域 (相對於攝影機視角)
    // 這些點大致對應到耳垂附近
    let rightEarlobe = face.keypoints[234];
    let leftEarlobe = face.keypoints[454];

    // 將攝影機原始座標映射到縮放後的影像位置
    if (rightEarlobe) {
      let rx = map(rightEarlobe.x, 0, capture.width, -w / 2, w / 2);
      let ry = map(rightEarlobe.y, 0, capture.height, -h / 2, h / 2);
      // 繪製耳環圖片，並設定大小
      image(earringImages[currentEarringIndex], rx, ry, earringSize * displayScale, earringSize * displayScale);
    }
    if (leftEarlobe) {
      let lx = map(leftEarlobe.x, 0, capture.width, -w / 2, w / 2);
      let ly = map(leftEarlobe.y, 0, capture.height, -h / 2, h / 2);
      // 繪製耳環圖片，並設定大小
      image(earringImages[currentEarringIndex], lx, ly, earringSize * displayScale, earringSize * displayScale);
    }
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 取得辨識結果的回呼函式
function gotFaces(results) {
  faces = results;
  if (faces.length > 0) {
    console.log('Faces detected:', faces.length);
    if (faces[0].keypoints[1]) {
      console.log('Nose tip detected at:', faces[0].keypoints[1].x, faces[0].keypoints[1].y);
    } else {
      console.log('Nose tip (keypoint 1) not detected for the first face.');
    }
  } else {
    console.log('No faces detected.');
  }
}

// 取得手部辨識結果的回呼函式
function gotHands(results) {
  hands = results;
}
