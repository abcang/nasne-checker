const Nasne = require('nasne');

Nasne.prototype.getHDDListAsync = function getHDDListAsync() {
  return new Promise((resolve, reject) => {
    this.getHDDList((data) => {
      if (data.errorcode === 0) {
        resolve(data);
      } else {
        reject(data);
      }
    });
  });
};

Nasne.prototype.getHDDInfoAsync = function getHDDInfoAsync(id) {
  return new Promise((resolve, reject) => {
    this.getHDDInfo(id, (data) => {
      if (data.errorcode === 0) {
        resolve(data);
      } else {
        reject(data);
      }
    });
  });
};

Nasne.prototype.getHDDDetailAsync = function getHDDDetailAsync() {
  return new Promise((resolve, reject) => {
    this.getHDDListAsync().then((data) => {
      const hdd = data.HDD.filter((info) => info.registerFlag === 1);
      return Promise.all(hdd.map((info) => this.getHDDInfoAsync(info.id)));
    }).then((data) => {
      const hdd = data.map((detail) => detail.HDD);
      resolve(hdd);
    }).catch(reject);
  });
};

Nasne.prototype.getReservedListAsync = function getReservedListAsync() {
  return new Promise((resolve, reject) => {
    this.getReservedList((data) => {
      if (data.errorcode === 0) {
        resolve(data);
      } else {
        reject(data);
      }
    });
  });
};

module.exports = Nasne;
