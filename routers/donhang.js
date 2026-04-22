var express = require('express');
var router = express.Router();
var DonHang = require('../models/donhang');
var DienThoai = require('../models/dienthoai');

// Middleware kiểm tra đăng nhập
var kiemTraDangNhap = (req, res, next) => {
    if (!req.session.MaNguoiDung) {
        req.session.error = "Bạn cần đăng nhập để thực hiện chức năng này.";
        return res.redirect('/dangnhap');
    }
    next();
};

var kiemTraQuyen = (req, res, next) => {
    if (!req.session.MaNguoiDung || (req.session.QuyenHan !== 'quantrivien' && req.session.QuyenHan !== 'nhanvien')) {
        req.session.error = "Bạn không có quyền truy cập trang này.";
        return res.redirect('/');
    }
    next();
};

// POST: Đặt hàng
router.post('/dathang', kiemTraDangNhap, async (req, res) => {
    try {
        var gh = req.session.giohang || [];
        var selectedItemsRaw = req.body.selectedItems;

        if (!selectedItemsRaw) {
            req.session.error = "Bạn chưa chọn sản phẩm nào để đặt hàng.";
            return res.redirect('/giohang');
        }

        var selectedItems = JSON.parse(selectedItemsRaw);
        if (selectedItems.length === 0) {
            req.session.error = "Bạn chưa chọn sản phẩm nào để đặt hàng.";
            return res.redirect('/giohang');
        }

        // Lọc ra các sản phẩm được chọn từ giỏ hàng hiện tại
        var itemsToOrder = [];
        var newGioHang = [...gh];

        for (let sel of selectedItems) {
            let item = gh.find(i => i._id.toString() === sel.id);
            if (item) {
                itemsToOrder.push({
                    _id: item._id,
                    GiaBan: item.GiaBan,
                    SoLuongMua: sel.quantity // Sử dụng số lượng mới nhất từ form
                });
                // Xóa sản phẩm này khỏi giỏ hàng
                newGioHang = newGioHang.filter(i => i._id.toString() !== sel.id);
            }
        }

        if (itemsToOrder.length === 0) {
            req.session.error = "Sản phẩm chọn không hợp lệ.";
            return res.redirect('/giohang');
        }

        var tongTien = itemsToOrder.reduce((sum, item) => sum + (item.GiaBan * item.SoLuongMua), 0);

        var chiTiet = itemsToOrder.map(item => {
            return {
                DienThoai: item._id,
                SoLuong: item.SoLuongMua,
                DonGia: item.GiaBan
            };
        });

        var data = {
            KhachHang: req.session.MaNguoiDung,
            TenNguoiNhan: req.body.TenNguoiNhan,
            DienThoai: req.body.DienThoai,
            DiaChi: req.body.DiaChi,
            GhiChu: req.body.GhiChu,
            TongTien: tongTien,
            ChiTiet: chiTiet
        };

        await DonHang.create(data);

        // Trừ số lượng tồn kho ngay khi đặt hàng (giữ chỗ)
        for (let item of itemsToOrder) {
            await DienThoai.findByIdAndUpdate(item._id, {
                $inc: { SoLuong: -item.SoLuongMua }
            });
        }

        // Cập nhật lại giỏ hàng (chỉ còn lại các sản phẩm KHÔNG được chọn)
        req.session.giohang = newGioHang;
        req.session.success = "Đặt hàng thành công!";
        res.redirect('/donhang/cuatoi');
    } catch (err) {
        req.session.error = "Có lỗi khi đặt hàng: " + err.message;
        res.redirect('/giohang');
    }
});

// GET: Quản lý đơn hàng (Admin/Nhân viên)
router.get('/', kiemTraQuyen, async (req, res) => {
    try {
        var dh = await DonHang.find().sort({ NgayDat: -1 }).populate('KhachHang');
        res.render('donhang', {
            title: 'Quản lý đơn hàng',
            donhangs: dh
        });
    } catch (err) {
        req.session.error = 'Lỗi hệ thống: ' + err.message;
        res.redirect('/');
    }
});

// GET: Đơn hàng của tôi (Khách hàng)
router.get('/cuatoi', kiemTraDangNhap, async (req, res) => {
    try {
        var dh = await DonHang.find({ KhachHang: req.session.MaNguoiDung }).sort({ NgayDat: -1 }).populate('ChiTiet.DienThoai');
        res.render('donhang_lichsu', {
            title: 'Đơn hàng của tôi',
            donhangs: dh
        });
    } catch (err) {
        req.session.error = 'Lỗi hệ thống: ' + err.message;
        res.redirect('/');
    }
});

// GET: Chi tiết đơn hàng (Admin/Nhân viên)
router.get('/chitiet/:id', kiemTraQuyen, async (req, res) => {
    try {
        var dh = await DonHang.findById(req.params.id)
            .populate('KhachHang')
            .populate('ChiTiet.DienThoai');

        if (!dh) {
            req.session.error = 'Đơn hàng không tồn tại.';
            return res.redirect('/donhang');
        }

        res.render('donhang_chitiet', {
            title: 'Chi tiết đơn hàng',
            donhang: dh
        });
    } catch (err) {
        req.session.error = 'Lỗi hệ thống: ' + err.message;
        res.redirect('/donhang');
    }
});

// POST: Cập nhật trạng thái đơn hàng (Admin/Nhân viên)
router.post('/capnhat/:id', kiemTraQuyen, async (req, res) => {
    try {
        var id = req.params.id;
        var trangThaiMoi = req.body.TrangThai;

        var dh = await DonHang.findById(id);
        if (!dh) {
            req.session.error = 'Đơn hàng không tồn tại.';
            return res.redirect('/donhang');
        }

        var trangThaiCu = dh.TrangThai;

        // Xử lý tồn kho khi trạng thái thay đổi
        // 1. Nếu chuyển SANG 'Đã hủy' từ trạng thái KHÁC 'Đã hủy' -> Hoàn lại kho
        if (trangThaiMoi === 'Đã hủy' && trangThaiCu !== 'Đã hủy') {
            for (let item of dh.ChiTiet) {
                await DienThoai.findByIdAndUpdate(item.DienThoai, {
                    $inc: { SoLuong: item.SoLuong }
                });
            }
        }

        // 2. Nếu chuyển TỪ 'Đã hủy' sang trạng thái KHÁC -> Trừ lại kho
        if (trangThaiCu === 'Đã hủy' && trangThaiMoi !== 'Đã hủy') {
            for (let item of dh.ChiTiet) {
                await DienThoai.findByIdAndUpdate(item.DienThoai, {
                    $inc: { SoLuong: -item.SoLuong }
                });
            }
        }

        // Xử lý lượt mua (chỉ tăng khi 'Đã giao')
        if (trangThaiMoi === 'Đã giao' && trangThaiCu !== 'Đã giao') {
            for (let item of dh.ChiTiet) {
                await DienThoai.findByIdAndUpdate(item.DienThoai, {
                    $inc: { LuotMua: item.SoLuong }
                });
            }
        }
        if (trangThaiCu === 'Đã giao' && trangThaiMoi !== 'Đã giao') {
            for (let item of dh.ChiTiet) {
                await DienThoai.findByIdAndUpdate(item.DienThoai, {
                    $inc: { LuotMua: -item.SoLuong }
                });
            }
        }

        dh.TrangThai = trangThaiMoi;
        await dh.save();

        req.session.success = 'Đã cập nhật trạng thái đơn hàng thành công.';
        res.redirect('/donhang/chitiet/' + id);
    } catch (err) {
        req.session.error = 'Lỗi hệ thống: ' + err.message;
        res.redirect('/donhang/chitiet/' + req.params.id);
    }
});

// GET: Khách hàng hủy đơn hàng
router.get('/huy/:id', kiemTraDangNhap, async (req, res) => {
    try {
        var dh = await DonHang.findById(req.params.id);

        if (!dh) {
            req.session.error = 'Đơn hàng không tồn tại.';
            return res.redirect('/donhang/cuatoi');
        }

        // Kiểm tra quyền sở hữu
        if (dh.KhachHang.toString() !== req.session.MaNguoiDung) {
            req.session.error = 'Bạn không có quyền hủy đơn hàng này.';
            return res.redirect('/donhang/cuatoi');
        }

        // Chỉ cho phép hủy khi đang chờ xác nhận
        if (dh.TrangThai !== 'Chờ xác nhận') {
            req.session.error = 'Chỉ có thể hủy đơn hàng khi đang ở trạng thái "Chờ xác nhận".';
            return res.redirect('/donhang/cuatoi');
        }

        // Hoàn lại kho
        for (let item of dh.ChiTiet) {
            await DienThoai.findByIdAndUpdate(item.DienThoai, {
                $inc: { SoLuong: item.SoLuong }
            });
        }

        dh.TrangThai = 'Đã hủy';
        await dh.save();

        req.session.success = 'Đã hủy đơn hàng thành công.';
        res.redirect('/donhang/cuatoi');
    } catch (err) {
        req.session.error = 'Lỗi khi hủy đơn hàng: ' + err.message;
        res.redirect('/donhang/cuatoi');
    }
});

// GET: Xóa đơn hàng (Chỉ Admin)
router.get('/xoa/:id', kiemTraQuyen, async (req, res) => {
    if (req.session.QuyenHan !== 'quantrivien') {
        req.session.error = 'Bạn không có quyền xóa đơn hàng.';
        return res.redirect('/donhang');
    }

    try {
        await DonHang.findByIdAndDelete(req.params.id);
        req.session.success = 'Đã xóa đơn hàng khỏi hệ thống.';
        res.redirect('/donhang');
    } catch (err) {
        req.session.error = 'Lỗi khi xóa đơn hàng: ' + err.message;
        res.redirect('/donhang');
    }
});

module.exports = router;
