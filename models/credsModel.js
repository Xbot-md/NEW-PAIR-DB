const mongoose = require('mongoose');

const credsSchema = new mongoose.Schema({
  credsId: {
    type: String,
    required: true,
    unique: true
  },
  credsData: {
    type: Object,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '90d' // Auto Delete Sessions After 3 Months from Date of Creation............
  }
});

const Creds = mongoose.model('Creds', credsSchema);

module.exports = Creds;
