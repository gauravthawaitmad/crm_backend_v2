const referenceRepository = require('../repositories/reference.repository');
const ResponseHandler = require('../handlers/response.handler');

const referenceController = {
  async states(req, res) {
    try {
      const states = await referenceRepository.getStates();
      return ResponseHandler.success(res, states);
    } catch (err) {
      return ResponseHandler.error(res, err.message);
    }
  },

  async cities(req, res) {
    try {
      const { state_id } = req.query;
      if (!state_id) return ResponseHandler.error(res, 'state_id query parameter is required', 400);
      const cities = await referenceRepository.getCities(state_id);
      return ResponseHandler.success(res, cities);
    } catch (err) {
      return ResponseHandler.error(res, err.message);
    }
  },

  async coUsers(req, res) {
    try {
      const users = await referenceRepository.getCOUsers();
      return ResponseHandler.success(res, users);
    } catch (err) {
      return ResponseHandler.error(res, err.message);
    }
  },

  async schools(req, res) {
    try {
      const { search } = req.query;
      const schools = await referenceRepository.getSchools(search || null);
      return ResponseHandler.success(res, schools);
    } catch (err) {
      return ResponseHandler.error(res, err.message);
    }
  },
};

module.exports = referenceController;
