# Hướng dẫn sử dụng (người dùng)

Extension **Clone to My Drive** sao chép file/thư mục trên tab Google Drive bạn đang mở vào một folder trên Drive của bạn (Google copy trên máy chủ, không tải file về máy tính).

## Cài đặt

1. Mở **Chrome Web Store**, tìm **Clone to My Drive**, bấm **Add to Chrome** / **Thêm vào Chrome**.

## Dùng hàng ngày

1. Mở tab **Google Drive** (folder, file, Google Docs, Sheets, …) chứa nội dung cần copy.
2. Bấm **icon extension** trên thanh công cụ → cửa sổ nhỏ (~720×520) hiện ra (tab Drive vẫn mở phía sau).
3. Chọn đích:
   - **Default** — folder `DriveClone` trên My Drive (extension tự tạo nếu chưa có).
   - **Clone to folder** — dán link folder đích `https://drive.google.com/drive/folders/...`.
4. Danh sách file/folder **tự load** khi cửa sổ mở → bỏ tick nếu không muốn copy → **Copy** (thanh tiến độ và % bên phải).
5. Lần đầu (hoặc khi Chrome yêu cầu lại), bấm **Allow** / **Cho phép** để extension được phép thao tác Google Drive của bạn.

Link folder đích và tùy chọn giao diện được **lưu trên máy** trong dữ liệu extension cho đến khi bạn xóa dữ liệu extension.

## Lỗi thường gặp

| Thông báo | Cách xử lý |
|-----------|------------|
| Cần đăng nhập / không thấy Allow | Đóng cửa sổ extension, bấm lại icon; hoặc bấm **Copy** để Chrome hiện hộp thoại Google. |
| Invalid folder link | Chọn **Clone to folder** và dùng link **folder** (không dùng link file hoặc Docs). |
| Danh sách trống | Mở tab Drive **trước**, rồi bấm icon extension. Đổi tab Drive? Đóng cửa sổ extension và bấm icon lại để tải danh sách mới. |
| Tab không phải Drive | Mở `drive.google.com` hoặc trang Docs/Sheets/… trước khi bấm icon extension. |
| Copy thất bại / lỗi mạng | Thử lại sau vài phút; folder rất lớn có thể mất nhiều thời gian — để cửa sổ extension mở đến khi thanh tiến độ xong. |

## Quyền riêng tư

Extension chỉ dùng quyền để đọc tab Drive hiện tại, lưu tùy chọn của bạn trên máy, và gọi Google Drive thay mặt bạn khi copy. Chi tiết: **[PRIVACY_POLICY.md](PRIVACY_POLICY.md)**.
