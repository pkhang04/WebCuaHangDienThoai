var express = require('express');
var router = express.Router();
var DanhMuc = require('../models/danhmuc');
var DienThoai = require('../models/dienthoai');
var DanhGia = require('../models/danhgia');

// GET: Trang chủ
router.get('/', async (req, res) => {
    try {
        var danhmucs = await DanhMuc.find();
        var dienthoais = await DienThoai.find().populate('DanhMuc');
        
        res.render('index', {
            title: 'Trang chủ MobiStore',
            danhmucs: danhmucs,
            dienthoais: dienthoais
        });
    } catch (err) {
        res.render('error', { title: 'Lỗi', message: err.message });
    }
});

// GET: Chi tiết sản phẩm
router.get('/sanpham/:id', async (req, res) => {
    try {
        // Tăng lượt xem lên 1
        var dt = await DienThoai.findByIdAndUpdate(req.params.id, { $inc: { LuotXem: 1 } }, { new: true }).populate('DanhMuc');
        if (!dt) {
            req.session.error = 'Sản phẩm không tồn tại';
            return res.redirect('/');
        }
        
        // Lấy danh sách đánh giá
        var danhgias = await DanhGia.find({ DienThoai: req.params.id }).populate('NguoiDung').sort({ NgayDanhGia: -1 });

        // Cập nhật session cho Mới xem (tùy chọn mở rộng sau)
        res.render('sanpham_chitiet', {
            title: dt.TenDT,
            sanpham: dt,
            danhgias: danhgias
        });
    } catch (err) {
        res.render('error', { title: 'Lỗi', message: err.message });
    }
});

// GET: Tìm kiếm
router.get('/timkiem', async (req, res) => {
    try {
        var query = req.query.q || '';
        // Tìm gần đúng theo regex (không phân biệt chữ hoa chữ thường)
        var dienthoais = await DienThoai.find({ TenDT: { $regex: query, $options: 'i' } }).populate('DanhMuc');
        
        res.render('timkiem', {
            title: 'Kết quả tìm kiếm: ' + query,
            dienthoais: dienthoais,
            query: query
        });
    } catch (err) {
        res.render('error', { title: 'Lỗi', message: err.message });
    }
});



// GET: Lỗi
router.get('/error', async (req, res) => {
    res.render('error', {
        title: 'Lỗi'
    });
});

// GET: Thành công
router.get('/success', async (req, res) => {
    res.render('success', {
        title: 'Hoàn thành'
    });
});

module.exports = router;