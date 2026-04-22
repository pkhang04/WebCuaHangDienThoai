var mongoose = require('mongoose');

var danhMucSchema = new mongoose.Schema({
    TenDanhMuc: { type: String, unique: true, required: true } 
});

var danhMucModel = mongoose.model('DanhMuc', danhMucSchema);

module.exports = danhMucModel;