var mongoose = require('mongoose');

var donHangSchema = new mongoose.Schema({
    KhachHang: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaiKhoan',
        required: true
    },
    TenNguoiNhan: { type: String, required: true },
    DienThoai: { type: String, required: true },
    DiaChi: { type: String, required: true },
    GhiChu: { type: String },
    NgayDat: { type: Date, default: Date.now },
    TrangThai: { 
        type: String, 
        enum: ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'],
        default: 'Chờ xác nhận' 
    },
    TongTien: { type: Number, required: true },
    ChiTiet: [{
        DienThoai: { type: mongoose.Schema.Types.ObjectId, ref: 'DienThoai' },
        SoLuong: { type: Number },
        DonGia: { type: Number }
    }]
});

var DonHang = mongoose.model('DonHang', donHangSchema);
module.exports = DonHang;
