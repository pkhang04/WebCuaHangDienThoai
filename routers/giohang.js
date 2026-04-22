var express = require('express');
var router = express.Router();
var DienThoai = require('../models/dienthoai');
var TaiKhoan = require('../models/taikhoan');

// Middleware kiểm tra đăng nhập
var kiemTraDangNhap = (req, res, next) => {
    if (!req.session.MaNguoiDung) {
        return res.redirect('/dangnhap');
    }
    next();
};

// Hàm đồng bộ giỏ hàng vào DB
async function dongBoGioHang(req) {
    if (req.session.MaNguoiDung) {
        var gh = req.session.giohang || [];
        var dataSave = gh.map(item => ({
            DienThoai: item._id,
            SoLuongMua: item.SoLuongMua,
            isSelected: item.isSelected
        }));
        await TaiKhoan.findByIdAndUpdate(req.session.MaNguoiDung, { GioHang: dataSave });
    }
}

// GET: Trang giỏ hàng
router.get('/', kiemTraDangNhap, (req, res) => {
    var gh = req.session.giohang || [];
    // Tính tổng tiền chỉ cho những sản phẩm được chọn
    var tongTien = gh.reduce((sum, item) => {
        return item.isSelected ? sum + (item.GiaBan * item.SoLuongMua) : sum;
    }, 0);
    
    res.render('giohang', { 
        title: 'Giỏ hàng của bạn', 
        tongTien: tongTien 
    });
});

// POST: Thêm sản phẩm vào giỏ hàng
router.post('/them/:id', kiemTraDangNhap, async (req, res) => {
    try {
        var id = req.params.id;
        var SoLuongThem = parseInt(req.body.SoLuong) || 1;
        
        var dt = await DienThoai.findById(id);
        if(!dt) { 
            req.session.error = "Sản phẩm không hợp lệ."; 
            return res.redirect('/'); 
        }
            
        req.session.giohang = req.session.giohang || [];
        
        // Khi thêm mới, chỉ tích chọn sản phẩm vừa thêm, bỏ tích các sản phẩm cũ (theo yêu cầu user)
        req.session.giohang.forEach(item => item.isSelected = false);

        var index = req.session.giohang.findIndex(item => item._id.toString() === id);
        
        if (index >= 0) {
            req.session.giohang[index].SoLuongMua += SoLuongThem;
            req.session.giohang[index].isSelected = true; // Tích chọn sản phẩm vừa thêm
            
            if (req.session.giohang[index].SoLuongMua > dt.SoLuong) {
                req.session.giohang[index].SoLuongMua = dt.SoLuong;
            }
            req.session.success = "Đã cập nhật số lượng trong giỏ hàng.";
        } else {
            req.session.giohang.push({
                _id: dt._id,
                TenDT: dt.TenDT,
                HinhAnh: dt.HinhAnh,
                GiaBan: dt.GiaBan,
                SoLuongMua: SoLuongThem <= dt.SoLuong ? SoLuongThem : dt.SoLuong,
                TonKho: dt.SoLuong,
                isSelected: true // Tích chọn sản phẩm vừa thêm
            });
            req.session.success = "Đã thêm vào giỏ hàng.";
        }
        
        await dongBoGioHang(req);
        res.redirect('/giohang');
    } catch(err) {
        req.session.error = "Có lỗi xảy ra: " + err.message;
        res.redirect('/');
    }
});

// POST: Cập nhật số lượng/trạng thái chọn qua AJAX
router.post('/capnhat-ajax', kiemTraDangNhap, async (req, res) => {
    var productId = req.body.productId;
    var quantity = req.body.quantity !== undefined ? parseInt(req.body.quantity) : null;
    var isSelected = req.body.isSelected !== undefined ? req.body.isSelected : null;
    
    var gh = req.session.giohang || [];
    var item = gh.find(i => i._id.toString() === productId);
    
    if (item) {
        if (quantity !== null) {
            if (quantity > 0 && quantity <= item.TonKho) {
                item.SoLuongMua = quantity;
            }
        }
        if (isSelected !== null) {
            item.isSelected = isSelected;
        }
        
        req.session.giohang = gh;
        await dongBoGioHang(req);
        return res.json({ success: true });
    }
    res.json({ success: false });
});

// GET: Xóa sản phẩm khỏi giỏ hàng
router.get('/xoa/:index', kiemTraDangNhap, async (req, res) => {
    var index = req.params.index;
    if(req.session.giohang && req.session.giohang[index]) {
        req.session.giohang.splice(index, 1);
        await dongBoGioHang(req);
        req.session.success = "Đã xóa sản phẩm khỏi giỏ hàng.";
    }
    res.redirect('/giohang');
});

// GET: Xóa toàn bộ giỏ hàng
router.get('/xoatatca', kiemTraDangNhap, async (req, res) => {
    req.session.giohang = [];
    await dongBoGioHang(req);
    req.session.success = "Đã dọn dẹp giỏ hàng.";
    res.redirect('/giohang');
});

module.exports = router;
