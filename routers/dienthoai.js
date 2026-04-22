var express = require('express');
var router = express.Router();
var DanhMuc = require('../models/danhmuc');
var DienThoai = require('../models/dienthoai');

// Middleware kiểm tra quyền (Quản trị viên hoặc Nhân viên)
const kiemTraQuyen = (req, res, next) => {
    if (req.session.MaNguoiDung && (req.session.QuyenHan === 'quantrivien' || req.session.QuyenHan === 'nhanvien')) {
        next();
    } else {
        req.session.error = 'Bạn không có quyền truy cập vào chức năng này.';
        res.redirect('/dangnhap');
    }
};

// GET: Danh sách điện thoại
router.get('/', async (req, res) => {
    try {
        var dt = await DienThoai.find()
            .populate('DanhMuc')
            .populate('TaiKhoan').exec();
        res.render('dienthoai', {
            title: 'Danh sách điện thoại',
            dienthoai: dt
        });
    } catch (err) {
        req.session.error = 'Lỗi hệ thống: ' + err.message;
        res.redirect('/');
    }
});

// GET: Thêm điện thoại
router.get('/them', kiemTraQuyen, async (req, res) => {
    try {
        var dm = await DanhMuc.find();
        res.render('dienthoai_them', {
            title: 'Thêm điện thoại',
            danhmuc: dm
        });
    } catch (err) {
        req.session.error = 'Lỗi hệ thống: ' + err.message;
        res.redirect('/dienthoai');
    }
});

var multer = require('multer');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/products')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
var upload = multer({ storage: storage });

// POST: Thêm điện thoại
router.post('/them', kiemTraQuyen, upload.single('HinhAnh'), async (req, res) => {
    try {
        var data = {
            DanhMuc: req.body.MaDanhMuc,
            TaiKhoan: req.session.MaNguoiDung,
            TenDT: req.body.TenDT,
            GiaGoc: req.body.GiaGoc || 0,
            GiaBan: req.body.GiaBan || 0,
            SoLuong: req.body.SoLuong || 0,
            HinhAnh: req.file ? req.file.filename : '',
            MoTa: req.body.MoTa,
            LuotXem: req.body.LuotXem || 0,
            LuotMua: req.body.LuotMua || 0
        };
        await DienThoai.create(data);
        req.session.success = 'Thêm sản phẩm mới thành công!';
        res.redirect('/dienthoai');
    } catch (err) {
        req.session.error = 'Thêm sản phẩm thất bại: ' + err.message;
        res.redirect('/dienthoai/them');
    }
});

// GET: Sửa điện thoại
router.get('/sua/:id', kiemTraQuyen, async (req, res) => {
    try {
        var id = req.params.id;
        var dm = await DanhMuc.find();
        var dt = await DienThoai.findById(id);
        res.render('dienthoai_sua', {
            title: 'Sửa thông tin điện thoại',
            danhmuc: dm,
            dienthoai: dt
        });
    } catch (err) {
        req.session.error = 'Sản phẩm không tồn tại hoặc lỗi hệ thống.';
        res.redirect('/dienthoai');
    }
});

// POST: Sửa điện thoại
router.post('/sua/:id', kiemTraQuyen, upload.single('HinhAnh'), async (req, res) => {
    try {
        var id = req.params.id;
        var data = {
            DanhMuc: req.body.MaDanhMuc,
            TenDT: req.body.TenDT,
            GiaGoc: req.body.GiaGoc || 0,
            GiaBan: req.body.GiaBan || 0,
            SoLuong: req.body.SoLuong || 0,
            MoTa: req.body.MoTa,
            LuotXem: req.body.LuotXem || 0,
            LuotMua: req.body.LuotMua || 0
        };
        if (req.file) {
            data.HinhAnh = req.file.filename;
        }
        await DienThoai.findByIdAndUpdate(id, data);
        req.session.success = 'Cập nhật sản phẩm thành công!';
        res.redirect('/dienthoai');
    } catch (err) {
        req.session.error = 'Cập nhật sản phẩm thất bại: ' + err.message;
        res.redirect('/dienthoai/sua/' + req.params.id);
    }
});

// GET: Xóa điện thoại
router.get('/xoa/:id', kiemTraQuyen, async (req, res) => {
    try {
        var id = req.params.id;
        await DienThoai.findByIdAndDelete(id);
        req.session.success = 'Đã xóa sản phẩm khỏi hệ thống.';
        res.redirect('/dienthoai');
    } catch (err) {
        req.session.error = 'Xóa sản phẩm thất bại: ' + err.message;
        res.redirect('/dienthoai');
    }
});

module.exports = router;