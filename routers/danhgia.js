const express = require('express');
const router = express.Router();
const DanhGia = require('../models/danhgia');
const DonHang = require('../models/donhang');

// Middleware kiểm tra đăng nhập
const kiemTraDangNhap = (req, res, next) => {
    if (req.session.MaNguoiDung) {
        next();
    } else {
        req.session.error = "Vui lòng đăng nhập để thực hiện chức năng này.";
        res.redirect('/auth/dangnhap');
    }
};

// Middleware kiểm tra quyền (Admin/Nhân viên)
const kiemTraQuyen = (req, res, next) => {
    if (req.session.MaNguoiDung && (req.session.QuyenHan === 'quantrivien' || req.session.QuyenHan === 'nhanvien')) {
        next();
    } else {
        req.session.error = "Bạn không có quyền truy cập chức năng này.";
        res.redirect('/');
    }
};

// POST: Gửi đánh giá
router.post('/them', kiemTraDangNhap, async (req, res) => {
    try {
        const { MaDonHang, MaDienThoai, SoSao, NoiDung } = req.body;

        // Kiểm tra xem đơn hàng có thực sự của người dùng này và đã giao thành công chưa
        const dh = await DonHang.findOne({
            _id: MaDonHang,
            KhachHang: req.session.MaNguoiDung,
            TrangThai: 'Đã giao'
        });

        if (!dh) {
            req.session.error = "Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao thành công.";
            return res.redirect('/donhang/cuatoi');
        }

        // Kiểm tra xem sản phẩm có trong đơn hàng không
        const holdsProduct = dh.ChiTiet.some(item => item.DienThoai.toString() === MaDienThoai);
        if (!holdsProduct) {
            req.session.error = "Sản phẩm không thuộc đơn hàng này.";
            return res.redirect('/donhang/cuatoi');
        }

        // Kiểm tra xem đã đánh giá chưa (mỗi sản phẩm trong 1 đơn hàng chỉ đánh giá 1 lần)
        const daDanhGia = await DanhGia.findOne({
            DonHang: MaDonHang,
            DienThoai: MaDienThoai,
            NguoiDung: req.session.MaNguoiDung
        });

        if (daDanhGia) {
            req.session.error = "Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi.";
            return res.redirect('/donhang/cuatoi');
        }

        const moi = new DanhGia({
            DienThoai: MaDienThoai,
            NguoiDung: req.session.MaNguoiDung,
            DonHang: MaDonHang,
            SoSao: parseInt(SoSao),
            NoiDung: NoiDung
        });

        await moi.save();
        req.session.success = "Cảm ơn bạn đã đánh giá sản phẩm!";
        res.redirect('/donhang/cuatoi');
    } catch (err) {
        req.session.error = "Lỗi khi gửi đánh giá: " + err.message;
        res.redirect('/donhang/cuatoi');
    }
});

// GET: Danh sách đánh giá (Admin/Staff)
router.get('/', kiemTraQuyen, async (req, res) => {
    try {
        const danhgias = await DanhGia.find()
            .populate('DienThoai')
            .populate('NguoiDung')
            .sort({ NgayDanhGia: -1 });
        
        res.render('danhgia', {
            title: 'Quản lý đánh giá',
            danhgias: danhgias
        });
    } catch (err) {
        req.session.error = "Lỗi: " + err.message;
        res.redirect('/');
    }
});

// POST: Phản hồi đánh giá
router.post('/phanhoi/:id', kiemTraQuyen, async (req, res) => {
    try {
        await DanhGia.findByIdAndUpdate(req.params.id, {
            $push: {
                PhanHoi: {
                    NoiDung: req.body.PhanHoi,
                    NguoiPhanHoi: req.session.MaNguoiDung,
                    NgayPhanHoi: Date.now()
                }
            }
        });
        req.session.success = "Đã gửi phản hồi thành công!";
        res.redirect('/danhgia');
    } catch (err) {
        req.session.error = "Lỗi phản hồi: " + err.message;
        res.redirect('/danhgia');
    }
});

// GET: Ẩn/Hiện đánh giá
router.get('/anthien/:id', kiemTraQuyen, async (req, res) => {
    try {
        const dg = await DanhGia.findById(req.params.id);
        dg.HienThi = !dg.HienThi;
        await dg.save();
        req.session.success = "Đã cập nhật trạng thái hiển thị.";
        res.redirect('/danhgia');
    } catch (err) {
        req.session.error = "Lỗi: " + err.message;
        res.redirect('/danhgia');
    }
});

// GET: Xóa đánh giá (Chỉ Admin)
router.get('/xoa/:id', kiemTraQuyen, async (req, res) => {
    if (req.session.QuyenHan !== 'quantrivien') {
        req.session.error = "Chỉ quản trị viên mới có quyền xóa đánh giá.";
        return res.redirect('/danhgia');
    }
    try {
        await DanhGia.findByIdAndDelete(req.params.id);
        req.session.success = "Đã xóa đánh giá thành công.";
        res.redirect('/danhgia');
    } catch (err) {
        req.session.error = "Lỗi xóa: " + err.message;
        res.redirect('/danhgia');
    }
});

module.exports = router;
