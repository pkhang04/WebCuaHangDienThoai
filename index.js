var express = require('express');
var app = express();
var mongoose = require('mongoose');
var session = require('express-session');
var path = require('path');

var indexRouter = require('./routers/index');
var authRouter = require('./routers/auth');
var danhmucRouter = require('./routers/danhmuc');
var taikhoanRouter = require('./routers/taikhoan');
var dienthoaiRouter = require('./routers/dienthoai');
var giohangRouter = require('./routers/giohang');
var donhangRouter = require('./routers/donhang');
var danhgiaRouter = require('./routers/danhgia');

var uri = 'mongodb://admin:admin123@ac-7hoieso-shard-00-02.pciiirh.mongodb.net:27017/dienthoai?ssl=true&authSource=admin';
mongoose.connect(uri).catch(err => console.log(err));

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', express.static(path.join(__dirname, 'public')));

app.use(session({
	name: 'MobiStore',						// Tên session (tự chọn)
	secret: 'Mèo méo meo mèo meo',		// Khóa bảo vệ (tự chọn)
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 30 * 24 * 60 * 60 * 1000// Hết hạn sau 30 ngày
	}
}));

app.use((req, res, next) => {
	// Chuyển biến session thành biến cục bộ
	res.locals.session = req.session;
	res.locals.giohang = req.session.giohang || [];

	// Lấy thông báo (lỗi, thành công) của trang trước đó (nếu có)
	var err = req.session.error;
	var msg = req.session.success;

	// Xóa session sau khi đã truyền qua biến trung gian
	delete req.session.error;
	delete req.session.success;

	// Gán thông báo (lỗi, thành công) vào biến cục bộ
	res.locals.message = '';
	if (err) res.locals.message = '<div class="alert alert-danger alert-dismissible fade show shadow-sm border-0 mb-4" role="alert"><i class="bi bi-exclamation-triangle-fill me-2"></i>' + err + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>';
	if (msg) res.locals.message = '<div class="alert alert-success alert-dismissible fade show shadow-sm border-0 mb-4" role="alert"><i class="bi bi-check-circle-fill me-2"></i>' + msg + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>';

	next();
});

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/danhmuc', danhmucRouter);
app.use('/taikhoan', taikhoanRouter);
app.use('/dienthoai', dienthoaiRouter);
app.use('/giohang', giohangRouter);
app.use('/donhang', donhangRouter);
app.use('/danhgia', danhgiaRouter);


app.listen(3000, () => {
	console.log('Server is running at http://127.0.0.1:3000');
});