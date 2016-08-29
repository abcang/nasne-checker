const axios = require('axios');

class Nasne {
  constructor(host) {
    this.host = host;
  }

  get(port, path, query = null) {
    return axios.get(`http://${this.host}:${port}${path}`, query);
  }

  getReservedList() {
    return this.get('64220', '/schedule/reservedListGet', {
      params: {
        searchCriteria: 0,
        filter: 0,
        startingIndex: 0,
        requestedCount: 0,
        sortCriteria: 0,
        withDescriptionLong: 0,
        withUserData: 1
      }
    }).then((res) => {
      const data = res.data;
      if (data.errorcode !== 0) {
        Promise.reject(data);
      }
      return data;
    });
  }

  getHddList() {
    return this.get('64210', '/status/HDDListGet').then((res) => {
      const data = res.data;
      if (data.errorcode !== 0) {
        Promise.reject(data);
      }
      return data;
    });
  }

  getHddInfo(id) {
    return this.get('64210', '/status/HDDInfoGet', {
      params: {id}
    }).then((res) => {
      const data = res.data;
      if (data.errorcode !== 0) {
        Promise.reject(data);
      }
      return data;
    });
  }

  getHddDetail() {
    return this.getHddList().then((data) => {
      const hdd = data.HDD.filter((info) => info.registerFlag === 1);
      return Promise.all(hdd.map((info) => this.getHddInfo(info.id)));
    }).then((data) => (data.map((detail) => detail.HDD)));
  }
}

module.exports = Nasne;
