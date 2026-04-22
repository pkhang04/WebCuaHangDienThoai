var mongoose = require('mongoose');

const dienThoaiSchema = new mongoose.Schema({
    DanhMuc: { type: mongoose.Schema.Types.ObjectId, ref: 'DanhMuc' },
    TaiKhoan: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan' },
    TenDT: { type: String, required: true },
    GiaGoc: { type: Number, default: 0 },
    GiaBan: { type: Number, default: 0 },
    SoLuong: { type: Number, default: 0 },
    HinhAnh: { type: String },
    MoTa: { type: String },
    LuotXem: { type: Number, default: 0 },
    LuotMua: { type: Number, default: 0 }
});

var dienThoaiModel = mongoose.model('DienThoai', dienThoaiSchema);

module.exports = dienThoaiModel;