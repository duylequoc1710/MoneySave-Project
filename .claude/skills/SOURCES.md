# Nguồn các skill trong thư mục này

Chép (vendored) vào repo để mọi phiên Claude Code – kể cả phiên cloud – tự nạp skill mà không cần cài plugin
(phiên cloud không tự cài plugin khai báo trong `.claude/settings.json`, đã thử 2026-11-16).

| Skill | Nguồn | Commit | Giấy phép |
|---|---|---|---|
| `ponytail`, `ponytail-audit`, `ponytail-review`, `ponytail-help` | https://github.com/DietrichGebert/ponytail (`skills/`) | `96608e07` | MIT (`ponytail/LICENSE`) |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (`.claude/skills/ui-ux-pro-max`) | `e59ff376` | MIT (`ui-ux-pro-max/LICENSE`) |

Chỉnh sửa so với bản gốc:
- Không chép hooks của ponytail (ghi sổ chi phí `~/.config/ponytail`, webhook) và 2 skill phụ thuộc hooks: `ponytail-debt`, `ponytail-gain`; bỏ 2 dòng đó khỏi `ponytail-help`.
- `ui-ux-pro-max/SKILL.md`: đổi `python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/..."` → `python3 "$(git rev-parse --show-toplevel)/.claude/skills/..."`; bỏ `scripts/tests`.
- Không chép các skill khác của ui-ux-pro-max-skill (ui-styling, brand, design, slides…) cho gọn.

Cập nhật: clone lại repo nguồn, chép đè thư mục skill tương ứng, áp lại các chỉnh sửa trên, cập nhật bảng commit.
**Không** bật thêm plugin cùng tên ở `.claude/settings.json` (tránh nạp trùng).
