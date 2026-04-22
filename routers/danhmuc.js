var express = require('express');
var router = express.Router();
var DanhMuc = require('../models/danhmuc');

// Middleware kiểm tra quyền quản trị
var checkAdmin = (req, res, next) => {
    if (req.session.QuyenHan !== 'quantrivien') {
        req.session.error = "Bạn không có quyền truy cập chức năng này.";
        return res.redirect('/');
    }
    next();
};

router.use(checkAdmin);

// GET: Danh mục điện thoại
router.get('/', async (req, res) => {
	var dm = await DanhMuc.find();
	res.render('danhmuc', {
		title: 'Danh mục điện thoại',
		danhmuc: dm
	});
});

// GET: Thêm danh mục điện thoại
router.get('/them', async (req, res) => {
	res.render('danhmuc_them', {
		title: 'Thêm danh mục điện thoại'
	});
});

// POST: Thêm danh mục điện thoại
router.post('/them', async (req, res) => {
	var data = {
		TenDanhMuc: req.body.TenDanhMuc
	};
	await DanhMuc.create(data);
	res.redirect('/danhmuc');
});

// GET: Sửa danh mục điện thoại
router.get('/sua/:id', async (req, res) => {
	var id = req.params.id;
	var dm = await DanhMuc.findById(id);
	res.render('danhmuc_sua', {
		title: 'Sửa danh mục điện thoại',
		danhmuc: dm
	});
});

// POST: Sửa danh mục điện thoại
router.post('/sua/:id', async (req, res) => {
	var id = req.params.id;
	var data = {
		TenDanhMuc: req.body.TenDanhMuc
	};
	await DanhMuc.findByIdAndUpdate(id, data);
	res.redirect('/danhmuc');
});

// GET: Xóa danh mục điện thoại
router.get('/xoa/:id', async (req, res) => {
	var id = req.params.id;
	await DanhMuc.findByIdAndDelete(id);
	res.redirect('/danhmuc');
});

module.exports = router;