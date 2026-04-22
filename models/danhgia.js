const mongoose = require('mongoose');

const danhGiaSchema = new mongoose.Schema({
    DienThoai: { type: mongoose.Schema.Types.ObjectId, ref: 'DienThoai', required: true },
    NguoiDung: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan', required: true },
    DonHang: { type: mongoose.Schema.Types.ObjectId, ref: 'DonHang', required: true },
    SoSao: { type: Number, required: true, min: 1, max: 5 },
    NoiDung: { type: String, required: true },
    PhanHoi: [{
        NoiDung: { type: String, required: true },
        NguoiPhanHoi: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan' },
        NgayPhanHoi: { type: Date, default: Date.now }
    }],
    HienThi: { type: Boolean, default: true },
    NgayDanhGia: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DanhGia', danhGiaSchema);
