const methods = {
    get(obj, key) {
        return key in obj ? obj[key] : obj;
    }
}

module.exports = methods;