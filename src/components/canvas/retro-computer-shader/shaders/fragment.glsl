precision highp float;

/* ========== Uniforms ========== */

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_scale;
uniform vec3  u_color;
uniform float u_lineWidth;
uniform float u_decorations;
uniform float u_hover;
uniform float u_bezelDepth;    // 前框厚度（3D 单位），默认 0.08
uniform float u_backRatio;    // 四棱台后背缩放比（0=点 / 1=与前面等大），默认 0.70
uniform float u_glowIntensity; // hover 荧光呼吸强度倍率，默认 1.0
uniform vec3  u_backSideColor; // 后背矩形左边和底边的颜色
uniform float u_backSideAlpha; // 后背矩形左边和底边的透明度（0~1）
uniform float u_orbitScale;    // 轨道环整体缩放倍率，默认 1.0
uniform float u_orbitLineWidth; // 轨道环实线专属粗细（像素），默认 1.2
uniform float u_particleSpeed; // 粒子运行速度倍率，默认 1.0
uniform float u_cometTrail;   // 0=none, 1=on
uniform float u_darkMode;     // 0=浅色主题, 1=深色主题
uniform vec4  u_dot1Color;    // rgb=粒子1颜色, a=1可见/0隐藏（轨道+粒子+拖影）
uniform vec4  u_dot2Color;    // rgb=粒子2颜色, a=1可见/0隐藏
uniform vec4  u_dot3Color;    // rgb=粒子3颜色, a=1可见/0隐藏
uniform vec3  u_trail1Color;  // 轨道1彗星拖影颜色
uniform vec3  u_trail2Color;  // 轨道2彗星拖影颜色
uniform vec3  u_trail3Color;  // 轨道3彗星拖影颜色

/* ========== SDF Primitives ========== */

float sdSegment(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdCircle(vec2 p, float r){ return length(p) - r; }

float sdBox(vec2 p, vec2 b){
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

/* ========== Drawing Helpers ========== */

float stroke(float d, float w, float aa){
  return smoothstep(w + aa, w - aa, abs(d));
}

float fill(float d, float aa){
  return smoothstep(aa, -aa, d);
}

float cross2(vec2 a, vec2 b){ return a.x * b.y - a.y * b.x; }

/* ========== Alpha-Over 合成（预乘 alpha） ========== */
// fg 叠加在 bg 之上，两者均使用预乘 alpha 格式
vec4 overPre(vec4 fg, vec4 bg) {
  return fg + bg * (1.0 - fg.a);
}

/* ========== Glow Stroke（荧光呼吸描边） ========== */
// 三层叠加：核心线 + 内 glow + 外 halo
// 强度随 u_time 呼吸脉动，u_hover 时增强
float sg(float d) {
  float lw      = u_lineWidth / u_resolution.y;
  float aa      = 1.4 / u_resolution.y;
  float breathe = 0.5 + 0.5 * sin(u_time * 1.2);
  float glowStr = 0.22 + breathe * 0.13 + u_hover * 0.50 * u_glowIntensity;

  float core = stroke(d, lw, aa);
  float g1   = stroke(d, lw * 3.2, aa * 5.0)  * glowStr * 0.48;
  float g2   = stroke(d, lw * 7.5, aa * 12.0) * glowStr * 0.16;
  return max(core, max(g1, g2));
}

// 弱版描边（网格线、结构线等次要元素）
float sgW(float d, float mult) {
  float lw = u_lineWidth / u_resolution.y;
  float aa = 1.4 / u_resolution.y;
  return stroke(d, lw * mult, aa);
}

/* ========== Isometric Projection（等距正交投影） ========== */

vec2 isoProj(vec3 p, float cY, float sY){
  float cp = cos(u_pitch), sp = sin(u_pitch);
  float x1 = cY * p.x + sY * p.z;
  float z1 = -sY * p.x + cY * p.z;
  return vec2(x1, cp * p.y - sp * z1);
}

/* ========== CRT Monitor 3D ========== */
//
// 几何分为两段：
//   1. 前框薄板  : z = [fz, bezelZ]，xy 尺寸 = fhs（均等，不收缩）
//   2. 四棱台主体: z = [bezelZ, bz]，xy 从 fhs 收缩到 bhs
//
// 参数：
//   ctr    : 显示器中心
//   fhs    : 前框半尺寸 xy（全尺寸）
//   bhs    : 四棱台后背半尺寸 xy（缩小）
//   fz     : 前面 z（最前）
//   bezelZ : 前框后面 z（= fz - bezelDepth，四棱台从此开始）
//   bz     : 四棱台后背 z（最深）
//
float crtMonitor(vec2 q, vec3 ctr, vec2 fhs, vec2 bhs,
                 float fz, float bezelZ, float bz,
                 float cY, float sY, float yaw, out float aSide) {

  /* ---- 12 个投影顶点 ---- */

  // 前面（z = fz，全尺寸）
  vec2 f_tl = isoProj(ctr + vec3(-fhs.x,  fhs.y, fz), cY, sY);
  vec2 f_tr = isoProj(ctr + vec3( fhs.x,  fhs.y, fz), cY, sY);
  vec2 f_bl = isoProj(ctr + vec3(-fhs.x, -fhs.y, fz), cY, sY);
  vec2 f_br = isoProj(ctr + vec3( fhs.x, -fhs.y, fz), cY, sY);

  // 前框后面（z = bezelZ，同样全尺寸，与前面构成薄框板）
  vec2 m_tl = isoProj(ctr + vec3(-fhs.x,  fhs.y, bezelZ), cY, sY);
  vec2 m_tr = isoProj(ctr + vec3( fhs.x,  fhs.y, bezelZ), cY, sY);
  vec2 m_bl = isoProj(ctr + vec3(-fhs.x, -fhs.y, bezelZ), cY, sY);
  vec2 m_br = isoProj(ctr + vec3( fhs.x, -fhs.y, bezelZ), cY, sY);

  // 四棱台后背（z = bz，缩小尺寸）
  vec2 b_tl = isoProj(ctr + vec3(-bhs.x,  bhs.y, bz), cY, sY);
  vec2 b_tr = isoProj(ctr + vec3( bhs.x,  bhs.y, bz), cY, sY);
  vec2 b_bl = isoProj(ctr + vec3(-bhs.x, -bhs.y, bz), cY, sY);
  vec2 b_br = isoProj(ctr + vec3( bhs.x, -bhs.y, bz), cY, sY);

  float r = 0.0;

  /* ==== 第一段：薄前框 ==== */

  // 正面矩形（始终可见）
  r = max(r, sg(sdSegment(q, f_tl, f_tr)));
  r = max(r, sg(sdSegment(q, f_bl, f_br)));
  r = max(r, sg(sdSegment(q, f_tl, f_bl)));
  r = max(r, sg(sdSegment(q, f_tr, f_br)));

  // 俯仰方向可见性
  float pitchUpA   = clamp( u_pitch * 4.0, 0.0, 1.0);
  float pitchDownA = clamp(-u_pitch * 4.0, 0.0, 1.0);
  
  // 偏转可见性（固定同步节奏）
  float sideA = clamp(abs(yaw) * 6.0, 0.0, 1.0);

  // 前框顶面（pitch > 0 俯视时可见）：f_tl/f_tr → m_tl/m_tr，以及 m 顶边
  if(pitchUpA > 0.01){
    r = max(r, sg(sdSegment(q, f_tl, m_tl)) * pitchUpA);
    r = max(r, sg(sdSegment(q, f_tr, m_tr)) * pitchUpA);
    r = max(r, sg(sdSegment(q, m_tl, m_tr)) * pitchUpA);
  }

  // 前框底面（pitch < 0 仰视时可见）
  if(pitchDownA > 0.01){
    r = max(r, sg(sdSegment(q, f_bl, m_bl)) * pitchDownA);
    r = max(r, sg(sdSegment(q, f_br, m_br)) * pitchDownA);
    r = max(r, sg(sdSegment(q, m_bl, m_br)) * pitchDownA);
  }

  // 前框侧面（yaw 偏转时可见）
  if(sideA > 0.01){
    if(yaw < 0.0){
      // 右侧面（top-right 视角）
      r = max(r, sg(sdSegment(q, f_tr, m_tr)) * sideA);
      r = max(r, sg(sdSegment(q, f_br, m_br)) * sideA);
      r = max(r, sg(sdSegment(q, m_tr, m_br)) * sideA);
    } else {
      // 左侧面
      r = max(r, sg(sdSegment(q, f_tl, m_tl)) * sideA);
      r = max(r, sg(sdSegment(q, f_bl, m_bl)) * sideA);
      r = max(r, sg(sdSegment(q, m_tl, m_bl)) * sideA);
    }
  }

  /* ==== 第二段：四棱台主体（从前框后面向后延伸收缩） ==== */
  // 中心死区：|yaw|<=5deg 时仅隐藏后背“侧部/底部”线条；顶部线条不受影响
  float centerDeadZone = radians(5.0);
  float centerBackA = smoothstep(centerDeadZone, centerDeadZone + 0.03, abs(yaw));

  // 后背边缘强度固定为 1，避免节奏参数影响颜色强弱
  float edgeMult = 1.0;

  // 顶面梯形（pitch > 0）
  if(u_pitch > 0.01){
    // 顶部线条始终保留，不参与中心死区隐藏
    float tA = clamp(u_pitch * 3.0, 0.0, 1.0);
    r = max(r, sg(sdSegment(q, m_tl, b_tl)) * tA);
    r = max(r, sg(sdSegment(q, m_tr, b_tr)) * tA);
    r = max(r, sg(sdSegment(q, b_tl, b_tr)) * tA * edgeMult);
  }

  // 底面梯形（pitch < 0）
  if(u_pitch < -0.01){
    float bA = clamp(-u_pitch * 3.0, 0.0, 1.0) * centerBackA;
    r = max(r, sg(sdSegment(q, m_bl, b_bl)) * bA);
    r = max(r, sg(sdSegment(q, m_br, b_br)) * bA);
    r = max(r, sg(sdSegment(q, b_bl, b_br)) * bA * edgeMult);
  }

  // 侧面梯形（yaw 偏转时可见）
  float sideABack = sideA * centerBackA;
  if(sideABack > 0.01){
    if(yaw < 0.0){
      r = max(r, sg(sdSegment(q, m_tr, b_tr)) * sideABack);
      r = max(r, sg(sdSegment(q, m_br, b_br)) * sideABack);
      r = max(r, sg(sdSegment(q, b_tr, b_br)) * sideABack * edgeMult);
    } else {
      r = max(r, sg(sdSegment(q, m_tl, b_tl)) * sideABack);
      r = max(r, sg(sdSegment(q, m_bl, b_bl)) * sideABack);
      r = max(r, sg(sdSegment(q, b_tl, b_bl)) * sideABack * edgeMult);
    }
  }

  // 后背面：顶边不进中心死区；侧/底线条进入中心死区
  float visA = clamp(abs(u_pitch) * 2.2 + abs(yaw) * 1.8, 0.0, 1.0);

  // 侧竖线与底线固定同步：仅按左右换侧统一过渡
  float transHalfWidth = 0.16;
  float rightSideOrder = 1.0 - smoothstep(-transHalfWidth, transHalfWidth, yaw);
  float leftSideOrder  = smoothstep(-transHalfWidth, transHalfWidth, yaw);
  
  aSide = 0.0;
  if(visA > 0.01){
    r = max(r, sg(sdSegment(q, b_tl, b_tr)) * visA);
    r = max(r, sg(sdSegment(q, b_tr, b_br)) * visA * centerBackA * rightSideOrder);
    
    // aSide 区域（左竖边和底边）与同侧线条同步过渡
    float baseVis = max(visA * centerBackA, sideABack);
    float bottomOrder = mix(rightSideOrder, leftSideOrder, step(0.0, yaw));
    aSide = max(aSide, sg(sdSegment(q, b_tl, b_bl)) * baseVis * leftSideOrder * u_backSideAlpha);
    aSide = max(aSide, sg(sdSegment(q, b_bl, b_br)) * baseVis * bottomOrder * u_backSideAlpha);
  }

  return r;
}

/* ========== Box 3D（连接柱 / 底座） ========== */
float box3D(vec2 q, vec3 ctr, vec3 hs, float cY, float sY, float yaw){
  vec2 ftl = isoProj(ctr + vec3(-hs.x,  hs.y,  hs.z), cY, sY);
  vec2 ftr = isoProj(ctr + vec3( hs.x,  hs.y,  hs.z), cY, sY);
  vec2 fbl = isoProj(ctr + vec3(-hs.x, -hs.y,  hs.z), cY, sY);
  vec2 fbr = isoProj(ctr + vec3( hs.x, -hs.y,  hs.z), cY, sY);
  vec2 btl = isoProj(ctr + vec3(-hs.x,  hs.y, -hs.z), cY, sY);
  vec2 btr = isoProj(ctr + vec3( hs.x,  hs.y, -hs.z), cY, sY);
  vec2 bbl = isoProj(ctr + vec3(-hs.x, -hs.y, -hs.z), cY, sY);
  vec2 bbr = isoProj(ctr + vec3( hs.x, -hs.y, -hs.z), cY, sY);

  float r = 0.0;

  r = max(r, sg(sdSegment(q, ftl, ftr)));
  r = max(r, sg(sdSegment(q, fbl, fbr)));
  r = max(r, sg(sdSegment(q, ftl, fbl)));
  r = max(r, sg(sdSegment(q, ftr, fbr)));

  if(u_pitch > 0.01){
    float tA = clamp(u_pitch * 3.0, 0.0, 1.0);
    r = max(r, sg(sdSegment(q, ftl, btl)) * tA);
    r = max(r, sg(sdSegment(q, ftr, btr)) * tA);
    r = max(r, sg(sdSegment(q, btl, btr)) * tA);
  }

  if(u_pitch < -0.01){
    float bA = clamp(-u_pitch * 3.0, 0.0, 1.0);
    r = max(r, sg(sdSegment(q, fbl, bbl)) * bA);
    r = max(r, sg(sdSegment(q, fbr, bbr)) * bA);
    r = max(r, sg(sdSegment(q, bbl, bbr)) * bA);
  }

  float sideA = clamp(abs(yaw) * 6.0, 0.0, 1.0);
  if(sideA > 0.01){
    if(yaw > 0.0){
      r = max(r, sg(sdSegment(q, btl, bbl)) * sideA);
      r = max(r, sg(sdSegment(q, fbl, bbl)) * sideA);
      r = max(r, sg(sdSegment(q, ftl, btl)) * sideA);
    } else {
      r = max(r, sg(sdSegment(q, btr, bbr)) * sideA);
      r = max(r, sg(sdSegment(q, fbr, bbr)) * sideA);
      r = max(r, sg(sdSegment(q, ftr, btr)) * sideA);
    }
  }

  return r;
}

/* ========== Main ========== */

void main(){
  float aspect = u_resolution.x / u_resolution.y;

  vec2 uv = (gl_FragCoord.xy / u_resolution - 0.5) / u_scale;
  uv.x *= aspect;

  float aa = 1.4 / u_resolution.y;
  float lw = u_lineWidth / u_resolution.y;
  float a  = 0.0;

  // 轨道/粒子/彗星拖影独立累积器（每条轨道独立着色）
  float a_orb1 = 0.0, a_orb2 = 0.0, a_orb3 = 0.0;
  float a_dot1 = 0.0, a_dot2 = 0.0, a_dot3 = 0.0;
  float a_trl1 = 0.0, a_trl2 = 0.0, a_trl3 = 0.0;

  /* 浮动动画 */
  float bob = sin(u_time * 1.2) * 0.005;
  vec2 sp = uv;
  sp.y -= bob;

  float yaw = u_yaw;
  float cY  = cos(yaw);
  float sY  = sin(yaw);

  /* ========== CRT 显示器主体 ========== */
  // 整体偏左，给右侧四棱台后背留出展示空间
  vec3  monCtr  = vec3(-0.07, 0.05, 0.0);
  vec2  frontHS = vec2(0.25, 0.20);            // 前框全尺寸
  vec2  backHS  = frontHS * u_backRatio;       // 四棱台后背（由 backRatio 控制）
  float frontZ  =  0.05;               // 前面 z
  float bezelZ  = frontZ - u_bezelDepth; // 前框后面 z（薄板厚度由 prop 控制）
  float backZ   = -0.20;               // 四棱台后背 z

  float aSide = 0.0;
  a = max(a, crtMonitor(sp, monCtr, frontHS, backHS,
                        frontZ, bezelZ, backZ, cY, sY, yaw, aSide));

  /* --- 屏幕边框 Bezel（位于正面 fz 平面） --- */
  float fz   = frontZ;
  vec2  scrC = vec2(monCtr.x, 0.078);
  vec2  scrH = vec2(0.182, 0.118);

  vec2 sBL = isoProj(vec3(scrC.x - scrH.x, scrC.y - scrH.y, fz), cY, sY);
  vec2 sBR = isoProj(vec3(scrC.x + scrH.x, scrC.y - scrH.y, fz), cY, sY);
  vec2 sTR = isoProj(vec3(scrC.x + scrH.x, scrC.y + scrH.y, fz), cY, sY);
  vec2 sTL = isoProj(vec3(scrC.x - scrH.x, scrC.y + scrH.y, fz), cY, sY);

  a = max(a, sg(sdSegment(sp, sBL, sBR)));
  a = max(a, sg(sdSegment(sp, sBR, sTR)));
  a = max(a, sg(sdSegment(sp, sTR, sTL)));
  a = max(a, sg(sdSegment(sp, sTL, sBL)));

  /* --- 屏幕网格（仅在屏幕投影四边形内） --- */
  float inScr = step(0.0, min(
    min(cross2(sBR - sBL, sp - sBL), cross2(sTR - sBR, sp - sBR)),
    min(cross2(sTL - sTR, sp - sTR), cross2(sBL - sTL, sp - sTL))
  ));

  if(inScr > 0.5){
    float scrBY = scrC.y - scrH.y;
    float scrTY = scrC.y + scrH.y;
    float scrLX = scrC.x - scrH.x;
    float scrRX = scrC.x + scrH.x;

    float gH = 0.025;
    for(int i = 1; i < 9; i++){
      float fy = scrBY + float(i) * gH;
      vec2 gL = isoProj(vec3(scrLX, fy, fz), cY, sY);
      vec2 gR = isoProj(vec3(scrRX, fy, fz), cY, sY);
      a = max(a, sgW(sdSegment(sp, gL, gR), 0.35) * 0.42);
    }

    float gV = 0.033;
    for(int i = 1; i < 11; i++){
      float fx = scrLX + float(i) * gV;
      vec2 gT = isoProj(vec3(fx, scrTY, fz), cY, sY);
      vec2 gB = isoProj(vec3(fx, scrBY, fz), cY, sY);
      a = max(a, sgW(sdSegment(sp, gT, gB), 0.35) * 0.42);
    }
  }

  /* --- 正面结构横线（下 Bezel 分隔线） --- */
  float structY = monCtr.y - frontHS.y + 0.042;
  vec2 shL = isoProj(vec3(monCtr.x - frontHS.x + 0.01, structY, fz), cY, sY);
  vec2 shR = isoProj(vec3(monCtr.x + frontHS.x - 0.01, structY, fz), cY, sY);

  vec2 mfBL = isoProj(vec3(monCtr.x - frontHS.x, monCtr.y - frontHS.y, fz), cY, sY);
  vec2 mfBR = isoProj(vec3(monCtr.x + frontHS.x, monCtr.y - frontHS.y, fz), cY, sY);
  vec2 mfTR = isoProj(vec3(monCtr.x + frontHS.x, monCtr.y + frontHS.y, fz), cY, sY);
  vec2 mfTL = isoProj(vec3(monCtr.x - frontHS.x, monCtr.y + frontHS.y, fz), cY, sY);
  float inMon = step(0.0, min(
    min(cross2(mfBR - mfBL, sp - mfBL), cross2(mfTR - mfBR, sp - mfBR)),
    min(cross2(mfTL - mfTR, sp - mfTR), cross2(mfBL - mfTL, sp - mfTL))
  ));
  a = max(a, sgW(sdSegment(sp, shL, shR), 0.5) * 0.38 * inMon);

  /* --- 正面四角装饰圆点 --- */
  float dotR = 0.005;
  vec2 cd1 = isoProj(vec3(monCtr.x - frontHS.x + 0.03, monCtr.y + frontHS.y - 0.03, fz), cY, sY);
  vec2 cd2 = isoProj(vec3(monCtr.x + frontHS.x - 0.03, monCtr.y + frontHS.y - 0.03, fz), cY, sY);
  vec2 cd3 = isoProj(vec3(monCtr.x - frontHS.x + 0.03, structY, fz), cY, sY);
  vec2 cd4 = isoProj(vec3(monCtr.x + frontHS.x - 0.03, structY, fz), cY, sY);
  a = max(a, fill(sdCircle(sp - cd1, dotR), aa) * 0.60);
  a = max(a, fill(sdCircle(sp - cd2, dotR), aa) * 0.60);
  a = max(a, fill(sdCircle(sp - cd3, dotR), aa) * 0.60);
  a = max(a, fill(sdCircle(sp - cd4, dotR), aa) * 0.60);

  /* --- 连接柱 Neck --- */
  vec3 neckC = vec3(monCtr.x, -0.200, 0.0);
  vec3 neckH = vec3(0.026, 0.026, 0.026);
  a = max(a, box3D(sp, neckC, neckH, cY, sY, yaw));

  /* --- 底座 Base/Stand --- */
  vec3 baseC = vec3(monCtr.x, -0.245, 0.0);
  vec3 baseH = vec3(0.135, 0.018, 0.06);
  a = max(a, box3D(sp, baseC, baseH, cY, sY, yaw));

  /* ========== 装饰元素 Decorations ========== */

  if(u_decorations > 0.5){
    float t  = u_time;
    vec2  oc = isoProj(monCtr, cY, sY);
    vec2  op = sp - oc;

    float olw = u_orbitLineWidth / u_resolution.y;

    float ang1 = 0.38;
    float c1 = cos(ang1), s1 = sin(ang1);
    vec2 rp1 = mat2(c1, -s1, s1, c1) * op;
    vec2 ab1 = vec2(0.37, 0.17) * u_orbitScale;
    float dR1 = abs(length(rp1 / ab1) - 1.0) * min(ab1.x, ab1.y);
    a_orb1 = max(a_orb1, stroke(dR1, olw, aa) * 0.65);

    float ang2 = -0.42;
    float c2 = cos(ang2), s2 = sin(ang2);
    vec2 rp2 = mat2(c2, -s2, s2, c2) * op;
    vec2 ab2 = vec2(0.35, 0.19) * u_orbitScale;
    float dR2 = abs(length(rp2 / ab2) - 1.0) * min(ab2.x, ab2.y);
    a_orb2 = max(a_orb2, stroke(dR2, olw, aa) * 0.65);

    float ang3 = 0.08;
    float c3 = cos(ang3), s3 = sin(ang3);
    vec2 rp3 = mat2(c3, -s3, s3, c3) * op;
    vec2 ab3 = vec2(0.40, 0.14) * u_orbitScale;
    float dR3 = abs(length(rp3 / ab3) - 1.0) * min(ab3.x, ab3.y);
    a_orb3 = max(a_orb3, stroke(dR3, olw * 0.85, aa) * 0.50);

    float dr = 0.007;

    float a1t = t * 0.6  * u_particleSpeed;
    vec2 dp1 = vec2(cos(a1t) * ab1.x, sin(a1t) * ab1.y);
    dp1 = mat2(c1, s1, -s1, c1) * dp1 + oc;
    a_dot1 = max(a_dot1, fill(sdCircle(sp - dp1, dr), aa));

    float a2t = t * 0.45 * u_particleSpeed + 3.14;
    vec2 dp2 = vec2(cos(a2t) * ab2.x, sin(a2t) * ab2.y);
    dp2 = mat2(c2, s2, -s2, c2) * dp2 + oc;
    a_dot2 = max(a_dot2, fill(sdCircle(sp - dp2, dr), aa));

    float a3t = t * 0.35 * u_particleSpeed + 1.57;
    vec2 dp3 = vec2(cos(a3t) * ab3.x, sin(a3t) * ab3.y);
    dp3 = mat2(c3, s3, -s3, c3) * dp3 + oc;
    a_dot3 = max(a_dot3, fill(sdCircle(sp - dp3, dr * 0.85), aa));

    // 彗星渐变拖影：基于椭圆弧角度的连续渐变光晕
    // 原理：每个像素若邻近轨道椭圆，则按其在椭圆上的等效角度
    //       计算它距粒子头部的弧度偏移，线性渐变透明度实现平滑拖尾。
    // 浅色主题适配：收窄光晕半径 + 提高衰减幂次 + 降低最大强度，
    //               避免漫射半透明像素叠加在白色背景上显"脏"。
    if(u_cometTrail > 0.5){
      float trailLen  = 2.2; // 拖影弧长（弧度）
      float softBase  = olw * 3.2 + aa * 5.0;
      // 浅色模式下光晕半径缩小到 45%，深色保持原尺寸
      float softR     = softBase * mix(0.45, 1.0, u_darkMode);
      // 浅色模式用 4 次幂快速收尾，深色用 2 次幂保持柔和扩散
      float fadePow   = mix(4.0, 2.0, u_darkMode);
      // 浅色模式最大强度降低，减少对白色背景的污染
      float trailMaxA = mix(0.50, 0.80, u_darkMode);

      // 轨道 1 渐变拖影
      float d1t  = abs(length(rp1 / ab1) - 1.0) * min(ab1.x, ab1.y);
      float th1  = atan(rp1.y / ab1.y, rp1.x / ab1.x);
      float dlt1 = mod(a1t - th1 + 6.28318530, 6.28318530);
      float fad1 = clamp(1.0 - dlt1 / trailLen, 0.0, 1.0) * step(dlt1, trailLen);
      float glo1 = (1.0 - smoothstep(0.0, softR, d1t)) * pow(fad1, fadePow);
      a_trl1 = max(a_trl1, glo1 * trailMaxA);

      // 轨道 2 渐变拖影
      float d2t  = abs(length(rp2 / ab2) - 1.0) * min(ab2.x, ab2.y);
      float th2  = atan(rp2.y / ab2.y, rp2.x / ab2.x);
      float dlt2 = mod(a2t - th2 + 6.28318530, 6.28318530);
      float fad2 = clamp(1.0 - dlt2 / trailLen, 0.0, 1.0) * step(dlt2, trailLen);
      float glo2 = (1.0 - smoothstep(0.0, softR, d2t)) * pow(fad2, fadePow);
      a_trl2 = max(a_trl2, glo2 * trailMaxA);

      // 轨道 3 渐变拖影
      float d3t  = abs(length(rp3 / ab3) - 1.0) * min(ab3.x, ab3.y);
      float th3  = atan(rp3.y / ab3.y, rp3.x / ab3.x);
      float dlt3 = mod(a3t - th3 + 6.28318530, 6.28318530);
      float fad3 = clamp(1.0 - dlt3 / trailLen, 0.0, 1.0) * step(dlt3, trailLen);
      float glo3 = (1.0 - smoothstep(0.0, softR * 0.9, d3t)) * pow(fad3, fadePow);
      a_trl3 = max(a_trl3, glo3 * trailMaxA * 0.875);
    }

    vec2 suv = uv;

    vec2  st1    = suv - vec2(-0.34, 0.26);
    float pulse1 = 0.85 + 0.15 * sin(t * 2.0);
    float sr1    = 0.019 * pulse1;
    float dSt1   = min(sdBox(st1, vec2(sr1 * 0.12, sr1)), sdBox(st1, vec2(sr1, sr1 * 0.12)));
    a = max(a, fill(dSt1, aa) * 0.80);

    vec2  st2    = suv - vec2(0.30, -0.24);
    float pulse2 = 0.85 + 0.15 * sin(t * 2.5 + 1.0);
    float sr2    = 0.013 * pulse2;
    float dSt2   = min(sdBox(st2, vec2(sr2 * 0.13, sr2)), sdBox(st2, vec2(sr2, sr2 * 0.13)));
    a = max(a, fill(dSt2, aa) * 0.75);

    vec2  st3    = suv - vec2(0.26, 0.20);
    float pulse3 = 0.85 + 0.15 * sin(t * 1.8 + 2.2);
    float sr3    = 0.009 * pulse3;
    float dSt3   = min(sdBox(st3, vec2(sr3 * 0.14, sr3)), sdBox(st3, vec2(sr3, sr3 * 0.14)));
    a = max(a, fill(dSt3, aa) * 0.60);

    a = max(a, fill(sdCircle(suv - vec2(-0.30, -0.10), 0.004), aa) * 0.45);
    a = max(a, fill(sdCircle(suv - vec2( 0.24,  0.14), 0.003), aa) * 0.45);
    a = max(a, fill(sdCircle(suv - vec2(-0.16,  0.30), 0.0035), aa) * 0.40);
    a = max(a, fill(sdCircle(suv - vec2( 0.35, -0.06), 0.003), aa) * 0.35);
    a = max(a, fill(sdCircle(suv - vec2(-0.38,  0.08), 0.0025), aa) * 0.35);
  }

  // 多层 alpha-over 合成（预乘 alpha 格式）
  // 层序：主结构 → backSide → 轨道环 → 彗星拖影 → 粒子圆点

  // 1. 主结构底层（监视器主体 + 屏幕 + 底座 + 背景装饰）
  vec4 out0 = vec4(u_color * a, a);

  // 2. 后背侧边覆盖
  out0 = overPre(vec4(u_backSideColor * aSide, aSide), out0);

  // 3. 轨道环（随对应粒子颜色，dotNColor.a=0 时整条轨道隐藏）
  out0 = overPre(vec4(u_dot1Color.rgb * a_orb1 * u_dot1Color.a, a_orb1 * u_dot1Color.a), out0);
  out0 = overPre(vec4(u_dot2Color.rgb * a_orb2 * u_dot2Color.a, a_orb2 * u_dot2Color.a), out0);
  out0 = overPre(vec4(u_dot3Color.rgb * a_orb3 * u_dot3Color.a, a_orb3 * u_dot3Color.a), out0);

  // 4. 彗星渐变拖影（使用独立拖影颜色，dotN 隐藏则对应拖影也隐藏）
  out0 = overPre(vec4(u_trail1Color * a_trl1 * u_dot1Color.a, a_trl1 * u_dot1Color.a), out0);
  out0 = overPre(vec4(u_trail2Color * a_trl2 * u_dot2Color.a, a_trl2 * u_dot2Color.a), out0);
  out0 = overPre(vec4(u_trail3Color * a_trl3 * u_dot3Color.a, a_trl3 * u_dot3Color.a), out0);

  // 5. 粒子圆点（最顶层）
  out0 = overPre(vec4(u_dot1Color.rgb * a_dot1 * u_dot1Color.a, a_dot1 * u_dot1Color.a), out0);
  out0 = overPre(vec4(u_dot2Color.rgb * a_dot2 * u_dot2Color.a, a_dot2 * u_dot2Color.a), out0);
  out0 = overPre(vec4(u_dot3Color.rgb * a_dot3 * u_dot3Color.a, a_dot3 * u_dot3Color.a), out0);

  gl_FragColor = vec4(out0.rgb / max(out0.a, 0.0001), out0.a);
}
