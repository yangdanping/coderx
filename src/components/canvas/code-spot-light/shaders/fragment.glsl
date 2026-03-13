precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_mouse;
uniform float u_radius;
uniform float u_aspect;
uniform float u_brightness;
uniform float u_dispersion;
uniform float u_dispersionInnerRatio;
uniform float u_dispersionOuterRatio;
uniform float u_scrollOffset;
uniform float u_textureRatio;
uniform float u_textureHeightRatio; // 新增：纹理高度比例补偿

uniform float u_enableLens;
uniform float u_lensMagnification;

varying vec2 vUv;

void main() {
    /* ========== Spotlight Position (聚光灯物理坐标修正) ========== */
    // 计算当前片段(Fragment)距离鼠标中心的距离
    vec2 distVec = (vUv - u_mouse);
    distVec.x *= u_aspect; // Aspect Ratio Correction: 补偿屏幕宽高比，使圆保持正圆
    float dist = length(distVec);

    /* ========== Lens Effect (凸透镜效果) ========== */
    vec2 workingVuv = vUv;
    if (u_enableLens > 0.5 && dist < u_radius) {
        float d = dist / u_radius;
        // 使用二次曲线实现平滑的缩放过渡，边缘缩放为1，中心缩放最大
        float amount = (1.0 - d * d) * (1.0 - 1.0 / u_lensMagnification);
        workingVuv = vUv - (vUv - u_mouse) * amount;
    }

    /* ========== UV Mapping & Sampling (UV 映射与采样) ========== */
    vec2 scrolledUv = workingVuv;
    // 这里可以把它理解成“贴图裁剪窗口”：
    // 1) 先按 u_textureHeightRatio 把有效内容映射回正确高度，避免文字被压扁；
    // 2) 再把这个窗口贴到顶部，避免第一行文字在上边缘被截掉。
    // 因为纹理会扩展到 2 的幂次方尺寸，真正有文字的区域只占其中一部分。
    scrolledUv.y = (1.0 - u_textureHeightRatio) + workingVuv.y * u_textureHeightRatio;
    // 关键：修正 X 轴采样，支持水平循环滚动
    scrolledUv.x = fract(workingVuv.x * u_textureRatio + u_scrollOffset);

    /* ========== Refraction/Dispersion Mask (色散/折射遮罩) ========== */
    // 术语：Mask/Edge Detection
    // 计算一个环状区域，只在聚光灯边缘产生色散效果
    float innerRatio = clamp(u_dispersionInnerRatio, 0.0, 1.0);
    float outerRatio = max(u_dispersionOuterRatio, 1.01);
    float edge = smoothstep(u_radius * innerRatio, u_radius, dist) * (1.0 - smoothstep(u_radius, u_radius * outerRatio, dist));
    
    /* ========== Chromatic Aberration (色散/颜色分离特效) ========== */
    // 术语：RGB Split / Chromatic Aberration
    // 偏移量由 u_dispersion 控制，决定 R 和 B 通道偏离 G 通道的距离
    float dispersionOffset = u_dispersion * edge;

    // 分通道采样实现色散效果
    float r = texture2D(u_texture, vec2(fract(scrolledUv.x + dispersionOffset), scrolledUv.y)).r;
    float g = texture2D(u_texture, scrolledUv).g;
    float b = texture2D(u_texture, vec2(fract(scrolledUv.x - dispersionOffset), scrolledUv.y)).b;

    // 获取当前像素的最大亮度值
    float intensity = max(max(r, g), b);
    if (intensity < 0.01) discard; // 优化：丢弃全透明像素

    /* ========== Gradient Rendering (颜色渐变渲染) ========== */
    // 根据距离中心的距离计算光晕强度
    float normalizedDist = dist / u_radius;
    float spotlight = max(u_brightness, 1.0 - normalizedDist * normalizedDist);

    // 预定义渐变色 (青/绿/蓝)
    vec3 centerColor = vec3(0.0, 1.0, 0.4); 
    vec3 midColor = vec3(0.0, 0.8, 1.0);    
    vec3 edgeColor = vec3(0.0, 0.5, 1.0);   
    
    vec3 gradient;
    if (normalizedDist < 0.4) {
        gradient = mix(centerColor, midColor, normalizedDist / 0.4);
    } else {
        gradient = mix(midColor, edgeColor, (normalizedDist - 0.4) / 0.6);
    }
    
    vec3 finalColor = vec3(r, g, b) * gradient;
    
    // 最终输出：聚光灯内外采用不同的亮度系数
    if (dist >= u_radius) {
        gl_FragColor = vec4(finalColor * u_brightness, intensity * u_brightness);
    } else {
        gl_FragColor = vec4(finalColor * spotlight, intensity * spotlight);
    }
}
