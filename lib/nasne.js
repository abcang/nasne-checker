const axios = require('axios');

class Nasne {
  constructor(host) {
    this.host = host;
  }

  get(port, path, query = null) {
    return axios.get(`http://${this.host}:${port}${path}`, query);
  }

  async getReservedList() {
    const { data } = await this.get('64220', '/schedule/reservedListGet', {
      params: {
        searchCriteria: 0,
        filter: 0,
        startingIndex: 0,
        requestedCount: 0,
        sortCriteria: 0,
        withDescriptionLong: 0,
        withUserData: 1
      }
    });

    if (data.errorcode !== 0) {
      throw data
    }
    return data;
  }

  async getHddList() {
    const { data } = await this.get('64210', '/status/HDDListGet');

    if (data.errorcode !== 0) {
      throw data
    }
    return data;
  }

  async getHddInfo(id) {
    const { data } = await this.get('64210', '/status/HDDInfoGet', {
      params: {id}
    });

    if (data.errorcode !== 0) {
      throw data;
    }
    return data;
  }

  async getHddDetail() {
    const data = await this.getHddList()
    const hdd = data.HDD.filter((info) => info.registerFlag === 1);
    const infoList = await Promise.all(hdd.map((info) => this.getHddInfo(info.id)));
    return infoList.map((detail) => detail.HDD);
  }
}

module.exports = Nasne;
