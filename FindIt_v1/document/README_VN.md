# Puppy Learn English - Tài liệu Hướng dẫn

Chào mừng bạn đến với tài liệu hướng dẫn của **Puppy Learn English**, một trò chơi giáo dục tương tác thú vị được thiết kế để giúp trẻ em học từ vựng tiếng Anh thông qua các minigame hấp dẫn.

## Tổng quan
Trò chơi được xây dựng dựa trên một **Bản đồ (Map Screen)**, nơi người chơi khám phá các Khu vực (Zones) và Chủ đề (Topics) khác nhau. Bằng cách hoàn thành các vòng thi trong một chủ đề, người chơi sẽ kiếm được phần thưởng (táo/tiền xu) và mở khóa các thử thách tiếp theo.

## Các vòng chơi (Stages)
Mỗi chủ đề bao gồm tối đa 4 vòng chơi theo tiến trình:

1. **Flashcards (Quiz)**: Giai đoạn học tập. Người chơi được xem hình ảnh và từ vựng, nghe phát âm mẫu để ghi nhớ.
2. **Matching (Nối từ)**: Trò chơi kết nối, người chơi vẽ các đường nối giữa hình ảnh và từ tiếng Anh tương ứng.
3. **Spelling (Đánh vần)**: Trò chơi xếp chữ, người chơi kéo thả các chữ cái vào đúng ô trống để hoàn thành từ vựng. *(Lưu ý: Vòng này có thể được tắt đi đối với các chủ đề sử dụng câu dài thay vì một từ đơn).*
4. **2-Player Shuffle (Đoán cốc 2 người)**: Một trò chơi đoán cốc cạnh tranh vui nhộn dành cho hai đội (Đội Đỏ và Đội Xanh). Các chiếc cốc sẽ xáo trộn, và người chơi phải đoán xem cốc nào giấu hình ảnh mục tiêu. Đội chiến thắng mỗi lượt sẽ được thưởng những quả táo.

## Giao diện Quản trị (Admin)
Hệ thống bao gồm một Bảng điều khiển Quản trị (`admin.html`) mạnh mẽ, cho phép giáo viên hoặc phụ huynh dễ dàng tùy chỉnh nội dung trò chơi mà không cần viết code.

### Tính năng của Admin:
- **Quản lý Cấp độ**: Tạo mới các Khu vực (Zones) và Chủ đề (Topics).
- **Cài đặt Độ khó**: Đặt mức độ Dễ, Trung bình, hoặc Khó cho chủ đề.
- **Hình ảnh**: Tải lên hình đại diện (avatar) cho chủ đề và hình nền lớn cho bối cảnh trò chơi tìm đồ vật.
- **Thiết lập Từ vựng**: Thêm từ/câu, tải lên hình ảnh minh họa nhỏ, và khoanh vùng (bounding box) cho các vật thể bị giấu trên hình nền chính.
- **Tắt vòng Đánh vần (Disable Spelling)**: Nút gạt chuyên dụng để bỏ qua vòng Spelling đối với các chủ đề chứa câu dài. Hệ thống sẽ tự động chuyển người chơi sang trò chơi Đoán cốc sau khi hoàn thành vòng Nối từ.

## Chi tiết Kỹ thuật
- Được xây dựng bằng các công nghệ Web tiêu chuẩn: HTML5, CSS3, và Vanilla JavaScript.
- Sử dụng `localStorage` và một backend Python siêu nhẹ (`server.py`) để lưu trữ dữ liệu trò chơi (`zones.json`, `scenes.json`).
- Tích hợp Web Speech API (`window.speechSynthesis`) để tự động phát âm tiếng Anh chuẩn xác.

## Hướng dẫn cài đặt và chạy
1. Khởi động server cục bộ bằng cách chạy lệnh `python3 server.py` (hoặc bất kỳ web server nào bạn dùng) tại thư mục gốc của dự án.
2. Mở file `index.html` trên trình duyệt web để chơi game.
3. Mở file `admin.html` để quản lý và chỉnh sửa nội dung.
