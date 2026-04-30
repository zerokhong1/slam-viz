# SLAM Research Visualizations

Interactive visualizations for LiDAR-Inertial Odometry research (ICRA 2027 prep).

## Pages

| Page | Nội dung |
|------|----------|
| `/limoncello` | Full paper walkthrough: pipeline, SGal(3), IESKF, i-Octree |
| `/sgal3` | Deep dive SGal(3) vs SO(3)×ℝ⁶: V₁ approximation, drift sim |
| `/octree` | Octree vs i-Octree: memory, insert, delete, Morton code |
| `/trees` | ikd-Tree vs i-Octree: KNN, rebalance, latency, benchmark |

## Deploy lên GitHub Pages

### Yêu cầu

- Git
- Node.js >= 18
- GitHub account

### Các bước

```bash
# 1. Giải nén và vào project
tar xzf slam-viz.tar.gz
cd slam-viz

# 2. Install dependencies
npm install

# 3. Tạo repo trên GitHub (dùng GitHub CLI hoặc tạo manual trên github.com)
git init
git add .
git commit -m "SLAM research visualizations"

# Nếu có GitHub CLI:
gh repo create slam-viz --public --source=. --push

# Nếu không có GitHub CLI, tạo repo manual trên github.com rồi:
# git remote add origin https://github.com/<username>/slam-viz.git
# git branch -M main
# git push -u origin main

# 4. Deploy lên GitHub Pages
npm run deploy
```

Xong. URL: `https://<username>.github.io/slam-viz/`

### Nếu tên repo khác `slam-viz`

Sửa `base` trong `vite.config.js`:

```js
base: '/<tên-repo-thực-tế>/',
```

R��i chạy lại `npm run deploy`.

### Cập nhật

Sửa code → commit → `npm run deploy` lại.

## Chạy local

```bash
npm install
npm run dev
# Mở http://localhost:5173/slam-viz/
```
