# ccviz - Trực quan hóa Claude Code

Trực quan hóa hoạt động của Claude Code dưới dạng quán bar thể thao pixel art 2D.

Xem các phiên code AI của bạn sống động như những khách hàng gọi đồ uống tại quán pub!

## Tính năng

- **Trực quan hóa thời gian thực** các phiên Claude Code
- **Chủ đề quán bar thể thao** với bartender, bồi bàn, đầu bếp
- **Khách hàng theo đội bóng** đại diện cho các phiên khác nhau (8 đội bóng)
- **Tháp bia** hiển thị mức sử dụng context (vơi dần khi context đầy)
- **MCP tool calls** được hiển thị như đơn đặt đồ ăn từ bếp
- **Bong bóng thoại** cho các tương tác NPC
- **Subagent** hiển thị như nhân vật phụ

## Yêu cầu

- [Bun](https://bun.sh/) runtime
- [Node.js](https://nodejs.org/) v18+
- Claude Code CLI đã cài đặt

## Bắt đầu nhanh

```bash
# 1. Clone và cài đặt dependencies
git clone <repo-url> ccviz
cd ccviz
bun install

# 2. Link package globally (chỉ cần 1 lần)
npm link

# 3. Cài đặt hooks vào project của bạn
cd /path/to/your/project
npx ccviz install --project   # Chỉ cho project này
# HOẶC
npx ccviz install --global    # Cho TẤT CẢ projects dùng Claude Code

# 4. Khởi động server trực quan hóa
cd /path/to/ccviz
bun run dev

# 5. Mở trình duyệt
open http://localhost:5173

# 6. Sử dụng Claude Code bình thường - xem phép màu!
```

## Tùy chọn cài đặt

### Cài đặt cho Project hiện tại
```bash
npx ccviz install --project
```
Cài hooks vào thư mục `./.claude/` của project hiện tại.

### Cài đặt Global
```bash
npx ccviz install --global
```
Cài hooks vào thư mục `~/.claude/`, áp dụng cho TẤT CẢ projects dùng Claude Code.

### Gỡ cài đặt
```bash
npx ccviz uninstall --project  # Gỡ khỏi project hiện tại
npx ccviz uninstall --global   # Gỡ khỏi config global
```

## Cách hoạt động

1. **Hooks** được cài vào `.claude/settings.json` của Claude Code
2. Khi bạn dùng Claude Code, hooks gửi events đến ccviz server (port 3847)
3. Frontend Phaser.js trực quan hóa các events theo thời gian thực
4. Mỗi phiên trở thành một khách hàng tại bàn với màu đội của họ

## Các thành phần trực quan

| Thành phần | Đại diện cho |
|------------|--------------|
| Khách hàng (fan bóng đá) | Phiên Claude Code |
| Tháp bia | Mức sử dụng context (cạn khi context đầy) |
| Bartender "claude-code" | Instance CC chính |
| Bồi bàn "claude-kit" | Giao hàng responses |
| Đầu bếp | Xử lý MCP tool calls |
| Đồ ăn | MCP tool calls / Skills |
| Màu & logo đội | Nhận dạng phiên |

## Kiến trúc

```
+-------------------+     HTTP Events     +-------------------+
|   Claude Code     | ------------------> |  ccviz Server     |
|   (với hooks)     |     Port 3847       |   (Bun + WS)      |
+-------------------+                     +---------+---------+
                                                    |
                                             WebSocket
                                                    |
                                          +---------v---------+
                                          |  Browser Client   |
                                          |  (Phaser.js)      |
                                          +-------------------+
```

## Phát triển

```bash
# Chạy ở chế độ development
bun run dev

# Build cho production
bun run build

# Kiểm tra type
bun run typecheck
```

## Cấu trúc Project

```
ccviz/
├── src/
│   ├── client/           # Phaser.js frontend
│   │   ├── scenes/       # Game scenes (BarScene, PreloadScene)
│   │   ├── sprites/      # Game objects (Customer, Bartender, v.v.)
│   │   └── state/        # Quản lý state
│   ├── server/           # Bun HTTP + WebSocket server
│   └── shared/           # Types và constants dùng chung
├── scripts/              # CLI tools (install, uninstall)
├── .claude/hooks/        # CC hooks gửi events
└── public/               # Static assets
```

## Các lệnh CLI

```bash
# Hiển thị trợ giúp
npx ccviz --help

# Cài đặt hooks
npx ccviz install              # Chế độ tương tác (hỏi project/global)
npx ccviz install --project    # Cài vào project hiện tại
npx ccviz install --global     # Cài global

# Gỡ cài đặt hooks
npx ccviz uninstall            # Chế độ tương tác
npx ccviz uninstall --project
npx ccviz uninstall --global

# Khởi động server
npx ccviz start
```

## Lưu ý

- Server ccviz phải chạy TRƯỚC khi bạn dùng Claude Code để nhận events
- Mỗi phiên CC mới sẽ tạo một khách hàng mới tại bàn trống
- Context càng cao, bia càng cạn (màu đỏ khi còn < 25%)
- Đóng phiên CC = khách hàng rời quán

## License

MIT

---

*Tạo bằng Phaser.js, Bun, và rất nhiều bia ảo*
