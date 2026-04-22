var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');

// GET: Đăng ký
router.get('/dangky', async (req, res) => {
	res.render('dangky', {
		title: 'Đăng ký tài khoản'
	});
});

// POST: Đăng ký
router.post('/dangky', async (req, res) => {
    try {
        // Kiểm tra xem tên đăng nhập đã tồn tại chưa
        var existingUser = await TaiKhoan.findOne({ TenDangNhap: req.body.TenDangNhap });
        if (existingUser) {
            req.session.error = "Tên đăng nhập '" + req.body.TenDangNhap + "' đã tồn tại. Vui lòng chọn tên khác.";
            return res.redirect('/dangky');
        }

        var salt = bcrypt.genSaltSync(10);
        var data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email,
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
            HinhAnh: 'user.jpg' // Mặc định ảnh đại diện
        };
        
        await TaiKhoan.create(data);
        req.session.success = 'Đã đăng ký tài khoản thành công. Vui lòng đăng nhập.';
        res.redirect('/dangnhap');
    } catch (err) {
        req.session.error = "Lỗi đăng ký: " + (err.code === 11000 ? "Tên đăng nhập đã được sử dụng." : err.message);
        res.redirect('/dangky');
    }
});

// GET: Đăng nhập
router.get('/dangnhap', async (req, res) => {
	res.render('dangnhap', {
		title: 'Đăng nhập'
	});
});

// POST: Đăng nhập
router.post('/dangnhap', async (req, res) => {
	if(req.session.MaNguoiDung) {
		req.session.error = 'Người dùng đã đăng nhập rồi.';
		res.redirect('/error');
	} else {
		var taikhoan = await TaiKhoan.findOne({ TenDangNhap: req.body.TenDangNhap }).exec();
		if(taikhoan) {
			if(bcrypt.compareSync(req.body.MatKhau, taikhoan.MatKhau)) {
				if(taikhoan.KichHoat == 0) {
					req.session.error = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.';
					res.redirect('/dangnhap');
				} else {
					// Đăng ký session
					req.session.MaNguoiDung = taikhoan._id;
					req.session.HoVaTen = taikhoan.HoVaTen;
					req.session.QuyenHan = taikhoan.QuyenHan;
					
					// Tải giỏ hàng của tài khoản từ DB
					var tkWithCart = await TaiKhoan.findById(taikhoan._id).populate('GioHang.DienThoai');
					req.session.giohang = (tkWithCart.GioHang || []).map(item => {
						if(item.DienThoai) {
							return {
								_id: item.DienThoai._id,
								TenDT: item.DienThoai.TenDT,
								HinhAnh: item.DienThoai.HinhAnh,
								GiaBan: item.DienThoai.GiaBan,
								SoLuongMua: item.SoLuongMua,
								TonKho: item.DienThoai.SoLuong,
								isSelected: item.isSelected
							};
						}
						return null;
					}).filter(i => i !== null);
					
					res.redirect('/');
				}
			} else {
				req.session.error = 'Mật khẩu không đúng.';
				res.redirect('/dangnhap');
			}
		} else {
			req.session.error = 'Tên đăng nhập không tồn tại.';
			res.redirect('/dangnhap');
		}
	}
});

// GET: Đăng xuất
router.get('/dangxuat', async (req, res) => {
	if(req.session.MaNguoiDung) {
		// Xóa session
		delete req.session.MaNguoiDung;
		delete req.session.HoVaTen;
		delete req.session.QuyenHan;
		delete req.session.giohang;
		
		res.redirect('/');
	} else {
		req.session.error = 'Người dùng chưa đăng nhập.';
		res.redirect('/dangnhap');
	}
});

// GET: Đăng ký
router.get('/admin', async (req, res) => {
	res.render('admin', {
		title: 'Trang quản trị'
	});
});

module.exports = router;