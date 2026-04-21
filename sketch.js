/**
 * Project: Irregular Curve Wire Loop Game (Neon Edition)
 * Description: 包含開始畫面、五個難度關卡與霓虹特效 (已修正背景網格 Bug)。
 */

// 遊戲狀態常數
const STATE = {
  MENU: "MENU",       // 開始畫面
  WAITING: "WAITING", // 關卡準備
  PLAYING: "PLAYING", // 遊戲進行中
  FAILED: "FAILED",   // 失敗
  SUCCESS: "SUCCESS", // 單關成功
  ALL_CLEAR: "ALL_CLEAR" // 全破關
};

let currentState = STATE.MENU;
let trackNodes = [];
const nodeSpacing = 60;

// 關卡設定 (1-5關：間距變窄、抖動變大、時間變短)
const LEVEL_CONFIG = [
  { gap: 0.18, noise: 0.003, time: 60, color: '#00FF96' }, // 第 1 關：簡單 (螢光綠)
  { gap: 0.14, noise: 0.005, time: 50, color: '#00C8FF' }, // 第 2 關：普通 (螢光藍)
  { gap: 0.10, noise: 0.008, time: 40, color: '#FFD700' }, // 第 3 關：困難 (霓虹黃)
  { gap: 0.07, noise: 0.012, time: 30, color: '#FF00FF' }, // 第 4 關：極限 (霓虹紫)
  { gap: 0.05, noise: 0.015, time: 20, color: '#FF3232' }  // 第 5 關：地獄 (霓虹紅)
];

let currentLevel = 0;
let totalScore = 0;
let levelScore = 0;

let trail = [];
let particles = [];
let timeLeft = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier New'); // 使用等寬字體增加科技感
}

function draw() {
  drawBackground();

  if (currentState !== STATE.MENU && currentState !== STATE.ALL_CLEAR) {
    drawTrack();
    updateTrail();
    updateParticles();
  }

  updateGameLogic();
  drawUI();
}

/**
 * 繪製帶有科技感的背景網格 (已修正變數 Bug)
 */
function drawBackground() {
  background(10, 10, 15);
  
  // 關閉發光以畫背景
  drawingContext.shadowBlur = 0;
  stroke(255, 255, 255, 10);
  strokeWeight(1);
  
  // 繪製垂直線
  for (let x = 0; x < width; x += 50) {
    line(x, 0, x, height);
  }
  
  // 繪製水平線
  for (let y = 0; y < height; y += 50) {
    line(0, y, width, y);
  }
}

/**
 * 取得軌道中間 Y 座標
 */
function getTrackMidY(x) {
  let left = trackNodes.find((n, i) => n.x <= x && trackNodes[i + 1]?.x > x);
  let right = trackNodes.find((n, i) => n.x > x && trackNodes[i - 1]?.x <= x);

  if (left && right) {
    let t = (x - left.x) / (right.x - left.x);
    let upper = lerp(left.upperY, right.upperY, t);
    let lower = lerp(left.lowerY, right.lowerY, t);
    return (upper + lower) / 2;
  }
  return height / 2;
}

/**
 * 軌道生成邏輯 (依據關卡難度)
 */
function generateTrack() {
  trackNodes = [];
  let config = LEVEL_CONFIG[currentLevel];
  let dynamicSafeGap = height * config.gap; 
  let noiseScale = config.noise;

  for (let x = -nodeSpacing; x <= width + nodeSpacing; x += nodeSpacing) {
    let noiseVal = noise(x * noiseScale, currentLevel * 100); 
    let centerY = map(noiseVal, 0, 1, height * 0.25, height * 0.75);
    
    trackNodes.push({
      x: x,
      upperY: centerY - dynamicSafeGap / 2,
      lowerY: centerY + dynamicSafeGap / 2
    });
  }
}

/**
 * 繪圖邏輯：加入霓虹發光效果
 */
function drawTrack() {
  let config = LEVEL_CONFIG[currentLevel];
  
  noFill();
  strokeWeight(4);
  stroke(config.color);
  
  // 開啟發光特效
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = color(config.color);

  // 上邊界
  beginShape();
  trackNodes.forEach(n => curveVertex(n.x, n.upperY));
  endShape();

  // 下邊界
  beginShape();
  trackNodes.forEach(n => curveVertex(n.x, n.lowerY));
  endShape();
  
  // 重置發光設定避免影響其他元素
  drawingContext.shadowBlur = 0;
}

/**
 * 更新與繪製滑鼠軌跡
 */
function updateTrail() {
  if (currentState === STATE.PLAYING) {
    trail.push({ x: mouseX, y: mouseY, alpha: 200 });
    if (trail.length > 30) trail.shift();
    
    noStroke();
    let config = LEVEL_CONFIG[currentLevel];
    trail.forEach(p => {
      fill(config.color + p.alpha.toString(16).padStart(2, '0')); // 動態透明度
      ellipse(p.x, p.y, 6);
      p.alpha -= 8; 
    });
    trail = trail.filter(p => p.alpha > 0);
  } else {
    trail = [];
  }
}

/**
 * 核心遊戲邏輯：碰撞與狀態轉換
 */
function updateGameLogic() {
  if (currentState === STATE.PLAYING) {
    // 每秒扣除時間
    if (frameCount % 60 === 0) {
      timeLeft--;
      if (timeLeft <= 0) {
        currentState = STATE.FAILED;
        levelScore = 0;
        return;
      }
    }

    // 過關判定 (抵達最右側)
    if (mouseX >= width - 30) {
      currentState = STATE.SUCCESS;
      levelScore = timeLeft * (currentLevel + 1) * 10; // 難度越高加權越多
      return;
    }

    // 碰撞偵測
    let left = trackNodes.find((n, i) => n.x <= mouseX && trackNodes[i+1]?.x > mouseX);
    let right = trackNodes.find((n, i) => n.x > mouseX && trackNodes[i-1]?.x <= mouseX);

    if (left && right) {
      let t = (mouseX - left.x) / (right.x - left.x);
      let currentUpper = lerp(left.upperY, right.upperY, t);
      let currentLower = lerp(left.lowerY, right.lowerY, t);

      // 玩家半徑約為 5px
      if (mouseY <= currentUpper + 5 || mouseY >= currentLower - 5) {
        currentState = STATE.FAILED;
        levelScore = 0;
        createExplosion(mouseX, mouseY);
      }
    }
  }
}

/**
 * UI 繪製
 */
function drawUI() {
  textAlign(CENTER, CENTER);
  
  if (currentState === STATE.MENU) {
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = '#00C8FF';
    fill(255);
    textSize(64);
    text("霓虹電流急急棒", width / 2, height / 2 - 40);
    
    drawingContext.shadowBlur = 0;
    textSize(24);
    if (frameCount % 60 < 30) fill(255, 255, 255, 150); // 閃爍效果
    else fill(255);
    text("- 點擊畫面開始遊戲 -", width / 2, height / 2 + 50);
  } 
  else if (currentState === STATE.WAITING) {
    let startY = getTrackMidY(60);
    let config = LEVEL_CONFIG[currentLevel];
    
    // 起點按鈕發光
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = config.color;
    fill(config.color);
    ellipse(60, startY, 40);
    
    drawingContext.shadowBlur = 0;
    fill(0);
    textSize(14);
    text("START", 60, startY);
    
    fill(255);
    textSize(24);
    text(`第 ${currentLevel + 1} 關`, width / 2, 40);
    textSize(18);
    text("將滑鼠移至亮點並點擊以啟動", width / 2, height - 40);
  } 
  else if (currentState === STATE.PLAYING) {
    // 玩家光點
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = '#FFFFFF';
    fill(255);
    noStroke();
    ellipse(mouseX, mouseY, 10);
    drawingContext.shadowBlur = 0;
    
    // UI 面板
    fill(255);
    textSize(24);
    textAlign(LEFT, TOP);
    text(`關卡: ${currentLevel + 1}/5`, 20, 20);
    text(`時間: ${timeLeft}s`, 20, 50);
    text(`總分: ${totalScore}`, 20, 80);
  } 
  else if (currentState === STATE.FAILED) {
    fill(255, 50, 50);
    textSize(48);
    text("SYSTEM FAILURE", width / 2, height / 2 - 30);
    textSize(24);
    fill(255);
    text("點擊畫面重新挑戰本關", width / 2, height / 2 + 30);
  } 
  else if (currentState === STATE.SUCCESS) {
    fill(100, 255, 100);
    textSize(48);
    text("LEVEL CLEARED", width / 2, height / 2 - 40);
    fill(255);
    textSize(24);
    text(`獲得分數: ${levelScore}`, width / 2, height / 2 + 10);
    text("點擊畫面進入下一關", width / 2, height / 2 + 50);
  }
  else if (currentState === STATE.ALL_CLEAR) {
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = '#FFD700';
    fill(255, 215, 0);
    textSize(64);
    text("MISSION ACCOMPLISHED", width / 2, height / 2 - 40);
    drawingContext.shadowBlur = 0;
    fill(255);
    textSize(32);
    text(`最終得分: ${totalScore}`, width / 2, height / 2 + 30);
    textSize(20);
    text("- 點擊畫面回到主畫面 -", width / 2, height / 2 + 80);
  }
}

/**
 * 互動控制
 */
function mousePressed() {
  if (currentState === STATE.MENU) {
    currentLevel = 0;
    totalScore = 0;
    startLevel();
  } 
  else if (currentState === STATE.WAITING) {
    let startY = getTrackMidY(60);
    if (dist(mouseX, mouseY, 60, startY) < 40) {
      currentState = STATE.PLAYING;
    }
  } 
  else if (currentState === STATE.FAILED) {
    startLevel(); // 重新挑戰當前關卡
  } 
  else if (currentState === STATE.SUCCESS) {
    totalScore += levelScore;
    currentLevel++;
    if (currentLevel >= LEVEL_CONFIG.length) {
      currentState = STATE.ALL_CLEAR;
    } else {
      startLevel();
    }
  }
  else if (currentState === STATE.ALL_CLEAR) {
    currentState = STATE.MENU;
  }
}

/**
 * 初始化並準備關卡
 */
function startLevel() {
  generateTrack();
  currentState = STATE.WAITING;
  timeLeft = LEVEL_CONFIG[currentLevel].time;
  levelScore = 0;
  particles = [];
  trail = [];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (currentState !== STATE.MENU && currentState !== STATE.ALL_CLEAR) {
    generateTrack();
  }
}

/**
 * 爆炸粒子系統更新
 */
function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15; // 重力
    p.alpha -= 4;
  });
  
  noStroke();
  particles.forEach(p => {
    fill(255, 100, 100, p.alpha);
    ellipse(p.x, p.y, p.size);
  });
  
  particles = particles.filter(p => p.alpha > 0);
}

/**
 * 創建爆炸粒子
 */
function createExplosion(x, y) {
  for (let i = 0; i < 30; i++) {
    let angle = random(TWO_PI);
    let speed = random(3, 8);
    particles.push({
      x: x,
      y: y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      alpha: 255,
      size: random(2, 6)
    });
  }
}