var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');

var multer = require('multer');
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './public/images/icons')
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + '-' + file.originalname)
	}
});
var upload = multer({ storage: storage });

// Middleware kiểm tra quyền quản trị
var checkAdmin = (req, res, next) => {
    if (req.session.QuyenHan !== 'quantrivien') {
        req.session.error = "Bạn không có quyền truy cập chức năng này.";
        return res.redirect('/');
    }
    next();
};

// GET: Danh sách tài khoản (Chỉ Admin)
router.get('/', checkAdmin, async (req, res) => {
	var tk = await TaiKhoan.find();
	res.render('taikhoan', {
		title: 'Danh sách tài khoản',
		taikhoan: tk
	});
});

// GET: Kích hoạt/Khóa tài khoản
router.get('/kichhoat/:id', checkAdmin, async (req, res) => {
	var id = req.params.id;
	var tk = await TaiKhoan.findById(id);
	var status = (tk.KichHoat == 1) ? 0 : 1;
	await TaiKhoan.findByIdAndUpdate(id, { KichHoat: status });
	res.redirect('/taikhoan');
});

// GET: Thêm tài khoản
router.get('/them', checkAdmin, async (req, res) => {
	res.render('taikhoan_them', {
		title: 'Thêm tài khoản'
	});
});

// POST: Thêm tài khoản
router.post('/them', checkAdmin, upload.single('HinhAnh'), async (req, res) => {
	if (req.body.MatKhau !== req.body.XacNhanMatKhau) {
		return res.redirect('/taikhoan/them');
	}
	var salt = bcrypt.genSaltSync(10);
	var data = {
		HoVaTen: req.body.HoVaTen,
		Email: req.body.Email,
		TenDangNhap: req.body.TenDangNhap,
		MatKhau: bcrypt.hashSync(req.body.MatKhau, salt)
	};
	if (req.file) {
		data.HinhAnh = req.file.filename;
	} else {
		data.HinhAnh = 'user.jpg';
	}
	await TaiKhoan.create(data);
	res.redirect('/taikhoan');
});

// GET: Sửa tài khoản
router.get('/sua/:id', checkAdmin, async (req, res) => {
	var id = req.params.id;
	var tk = await TaiKhoan.findById(id);
	res.render('taikhoan_sua', {
		title: 'Sửa tài khoản',
		taikhoan: tk
	});
});

// POST: Sửa tài khoản
router.post('/sua/:id', checkAdmin, upload.single('HinhAnh'), async (req, res) => {
	var id = req.params.id;
	var salt = bcrypt.genSaltSync(10);
	var data = {
		HoVaTen: req.body.HoVaTen,
		Email: req.body.Email,
		TenDangNhap: req.body.TenDangNhap,
		QuyenHan: req.body.QuyenHan,
		KichHoat: req.body.KichHoat
	};
	if (req.file) {
		data.HinhAnh = req.file.filename;
	}
	if (req.body.MatKhau) {
		if (req.body.MatKhau !== req.body.XacNhanMatKhau) {
			return res.redirect('/taikhoan/sua/' + id);
		}
		data['MatKhau'] = bcrypt.hashSync(req.body.MatKhau, salt);
	}
	await TaiKhoan.findByIdAndUpdate(id, data);
	res.redirect('/taikhoan');
});

// GET: Xóa tài khoản
router.get('/xoa/:id', checkAdmin, async (req, res) => {
	var id = req.params.id;
	await TaiKhoan.findByIdAndDelete(id);
	res.redirect('/taikhoan');
});

// GET: Hồ sơ cá nhân
router.get('/profile', async (req, res) => {
    if (!req.session.MaNguoiDung) {
        return res.redirect('/dangnhap');
    }
    var tk = await TaiKhoan.findById(req.session.MaNguoiDung);
    res.render('taikhoan_profile', {
        title: 'Hồ sơ cá nhân',
        taikhoan: tk
    });
});

// POST: Cập nhật hồ sơ cá nhân
router.post('/profile', upload.single('HinhAnh'), async (req, res) => {
    try {
        var id = req.session.MaNguoiDung;
        var data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email
        };
        if (req.file) {
            data.HinhAnh = req.file.filename;
        }
        
        if (req.body.MatKhau) {
            if (req.body.MatKhau !== req.body.XacNhanMatKhau) {
                req.session.error = "Mật khẩu xác nhận không khớp.";
                return res.redirect('/taikhoan/profile');
            }
            var salt = bcrypt.genSaltSync(10);
            data.MatKhau = bcrypt.hashSync(req.body.MatKhau, salt);
        }
        
        await TaiKhoan.findByIdAndUpdate(id, data);
        
        // Cập nhật lại session
        req.session.HoVaTen = req.body.HoVaTen;
        
        req.session.success = "Đã cập nhật hồ sơ thành công.";
        res.redirect('/taikhoan/profile');
    } catch (err) {
        req.session.error = "Lỗi: " + err.message;
        res.redirect('/taikhoan/profile');
    }
});

module.exports = router;