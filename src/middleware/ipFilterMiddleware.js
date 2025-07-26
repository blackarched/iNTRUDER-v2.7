const ipfilter = require('express-ip-filter').IpFilter;
const config = require('../../config');

const ips = config.security.blockedIps || [];

module.exports = ipfilter(ips, { mode: 'deny' });
